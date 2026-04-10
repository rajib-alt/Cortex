import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Map, Search, Loader2, Save, Sparkles, ChevronRight, AlertCircle, BookOpen, Clock, Target, CheckCircle2, ExternalLink } from 'lucide-react'
import { useNotesStore } from '@/store/notesStore'
import { Button, Input, Badge, Card, CardContent, Progress } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

interface RoadmapPhase {
  phase: string
  duration: string
  goals: string[]
  resources: { title: string; type: string; url?: string }[]
  skills: string[]
  milestone: string
}

interface RoadmapData {
  topic: string
  overview: string
  totalDuration: string
  difficulty: string
  prerequisites: string[]
  phases: RoadmapPhase[]
  tools: string[]
  communities: string[]
  generatedAt: string
}

const FREE_MODELS = [
  'z-ai/glm-4.5-air:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-120b:free',
]

async function generateRoadmap(topic: string, apiKey: string, provider: 'openrouter' | 'gemini', onChunk: (t: string) => void, fallbackOpenRouterKey?: string): Promise<RoadmapData> {
  const systemPrompt = `You are an expert learning roadmap creator. Generate a detailed, practical learning roadmap as valid JSON only — no markdown fences, no explanation outside the JSON.

The JSON must match this exact structure:
{
  "topic": "string",
  "overview": "2-3 sentence description of what you'll learn and why it matters",
  "totalDuration": "e.g. 3-6 months",
  "difficulty": "Beginner|Intermediate|Advanced",
  "prerequisites": ["item1", "item2"],
  "phases": [
    {
      "phase": "Phase name",
      "duration": "e.g. 2 weeks",
      "goals": ["goal1", "goal2", "goal3"],
      "resources": [
        { "title": "Resource name", "type": "Course|Book|Video|Article|Tool", "url": "https://..." }
      ],
      "skills": ["skill1", "skill2"],
      "milestone": "What you can do after this phase"
    }
  ],
  "tools": ["tool1", "tool2"],
  "communities": ["community1"],
  "generatedAt": "${new Date().toISOString()}"
}

Generate 4-6 phases. Include real, specific resources with actual URLs where possible. Be opinionated and practical.`

  let fullText = ''
  let usedProvider = provider
  let errorHint = ''

  if (provider === 'gemini') {
    try {
      const response = await fetch('https://gemini.googleapis.com/v1/models/chat-bison-001:generate', {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        redirect: 'follow',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              content: [
                { type: 'text', text: systemPrompt },
                { type: 'text', text: `Create a comprehensive learning roadmap for: "${topic}"\n\nContext: I'm a digital marketing professional in Bangladesh working on B2B SaaS (CRM, SFA, ERP). Make it practical and career-relevant.` },
              ],
            },
          ],
          parameters: { temperature: 0.7, max_output_tokens: 3000 },
        }),
      })

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        throw new Error(`Gemini API error: ${response.status}${bodyText ? ` — ${bodyText}` : ''}`)
      }
      const data = await response.json()
      const candidate = data?.candidates?.[0]
      if (candidate?.content) {
        fullText = candidate.content.map((part: any) => part.text || '').join('')
      } else if (candidate?.output?.[0]?.content) {
        fullText = candidate.output[0].content.map((part: any) => part.text || '').join('')
      }
    } catch (fetchError: any) {
      const message = String(fetchError?.message || '')
      if (fallbackOpenRouterKey && (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('networkerror') || message.toLowerCase().includes('cors'))) {
        usedProvider = 'openrouter'
        errorHint = 'Gemini browser requests are often blocked by CORS/network restrictions. Falling back to OpenRouter.'
      } else {
        throw new Error(message || 'Gemini request failed. Gemini is not reliably available from the browser without a proxy. Use OpenRouter or a server-side proxy.')
      }
    }
  }

  if (usedProvider === 'openrouter') {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      redirect: 'follow',
      headers: {
        'Authorization': `Bearer ${usedProvider === 'openrouter' ? (fallbackOpenRouterKey || apiKey) : apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: FREE_MODELS[0],
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a comprehensive learning roadmap for: "${topic}"\n\nContext: I'm a digital marketing professional in Bangladesh working on B2B SaaS (CRM, SFA, ERP). Make it practical and career-relevant.` },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      throw new Error(`OpenRouter API error: ${response.status}${bodyText ? ` — ${bodyText}` : ''}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || ''
    if (content) {
      fullText = content
      onChunk(content)
    }
  }

  if (!fullText) {
    throw new Error('No response content received from the AI provider.')
  }

  // Try to extract JSON from the response
  const jsonMatch = fullText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse roadmap JSON from AI response')
  return JSON.parse(jsonMatch[0])
}

function roadmapToMarkdown(r: RoadmapData): string {
  const today = new Date().toISOString().split('T')[0]
  return `# Learning Roadmap: ${r.topic}

**Generated:** ${today}
**Total Duration:** ${r.totalDuration}
**Difficulty:** ${r.difficulty}

## Overview
${r.overview}

## Prerequisites
${r.prerequisites.map(p => `- ${p}`).join('\n') || '- None'}

${r.phases.map((phase, i) => `## Phase ${i + 1}: ${phase.phase}

**Duration:** ${phase.duration}
**Milestone:** ${phase.milestone}

### Goals
${phase.goals.map(g => `- [ ] ${g}`).join('\n')}

### Skills to Learn
${phase.skills.map(s => `- ${s}`).join('\n')}

### Resources
${phase.resources.map(r => `- **${r.title}** (${r.type})${r.url ? ` — [Link](${r.url})` : ''}`).join('\n')}

---
`).join('\n')}

## Tools & Stack
${r.tools.map(t => `- ${t}`).join('\n')}

## Communities & Support
${r.communities.map(c => `- ${c}`).join('\n')}

## Observations
- [topic] ${r.topic} #roadmap #learning
- [duration] ${r.totalDuration}
- [difficulty] ${r.difficulty} #career
- [status] in-progress

## Relations
- part_of [[Learning Path ${new Date().getFullYear()}]]
- relates_to [[${r.topic}]]
`
}

// Phase card component
function PhaseCard({ phase, index }: { phase: RoadmapPhase; index: number }) {
  const [open, setOpen] = useState(index === 0)
  return (
    <Card className={cn('transition-all', open ? 'border-primary/30' : 'border-border')}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(s => !s)}>
        <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{phase.phase}</p>
          <p className="text-xs text-muted-foreground">{phase.duration} · {phase.skills.slice(0, 3).join(', ')}</p>
        </div>
        <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-90')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <CardContent className="border-t border-border pt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1.5"><Target className="h-3 w-3" />Milestone</p>
                <p className="text-sm text-foreground bg-primary/5 rounded-lg px-3 py-2">{phase.milestone}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Goals</p>
                <div className="space-y-1">
                  {phase.goals.map((g, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                      {g}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Resources</p>
                <div className="space-y-1.5">
                  {phase.resources.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] shrink-0">{r.type}</Badge>
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                          {r.title}<ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.title}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default function RoadmapView() {
  const { createNote, config, aiProvider, openRouterKey, geminiKey } = useNotesStore()
  const [query, setQuery] = useState('')
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const apiKey = aiProvider === 'gemini' ? geminiKey : openRouterKey
  const provider = aiProvider || 'openrouter'

  const generate = async () => {
    if (!query.trim()) return
    if (!apiKey) {
      setError(provider === 'gemini' ? 'Set your Gemini API key in Settings first' : 'Set your OpenRouter API key in Settings first')
      return
    }
    setIsGenerating(true)
    setStreamText('')
    setError('')
    setRoadmap(null)
    setSaved(false)
    try {
      const result = await generateRoadmap(query.trim(), apiKey, provider, (chunk) => {
        setStreamText(t => t + chunk)
      }, openRouterKey)
      setRoadmap(result)
    } catch (e: any) {
      const message = e?.message || 'Failed to generate roadmap. Try a different model key.'
      if (provider === 'gemini' && message.toLowerCase().includes('failed to fetch')) {
        setError('Gemini request failed. Browser-based Gemini calls may be blocked by CORS or network restrictions. ' + message)
      } else {
        setError(message)
      }
    } finally {
      setIsGenerating(false)
      setStreamText('')
    }
  }

  const saveAsNote = async () => {
    if (!roadmap) return
    if (!config) { setError('Connect GitHub in Settings to save roadmaps'); return }
    setIsSaving(true)
    try {
      await createNote({
        title: `Roadmap — ${roadmap.topic}`,
        folder: 'roadmaps',
        tags: ['roadmap', 'learning', roadmap.topic.toLowerCase().replace(/\s+/g, '-')],
        content: roadmapToMarkdown(roadmap),
      })
      setSaved(true)
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const EXAMPLE_QUERIES = [
    'AI Marketing for B2B SaaS',
    'Digital Marketing with AI tools',
    'n8n Workflow Automation',
    'Content Strategy for SaaS',
    'Python for Marketing Automation',
    'SEO & Technical SEO',
    'Facebook Ads Mastery',
    'Product-Led Growth',
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <Map className="h-4 w-4 text-orange-400" />
        <div className="flex-1">
          <span className="font-heading font-semibold text-sm">AI Roadmap Generator</span>
          <span className="text-xs text-muted-foreground ml-2">— AI-generated learning paths, saved as notes</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="uppercase tracking-[0.18em]">Provider</span>
          <span className="rounded-full bg-secondary px-2 py-1">{provider === 'gemini' ? 'Gemini' : 'OpenRouter'}</span>
        </div>
        {roadmap && (
          <Button size="sm" onClick={saveAsNote} disabled={isSaving || saved} className="gap-1.5">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? '✓ Saved!' : 'Save as Note'}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
          {/* Search bar */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generate()}
                placeholder="What do you want to learn? e.g. 'AI Marketing for B2B SaaS'"
                className="text-sm"
                disabled={isGenerating}
              />
              <Button onClick={generate} disabled={isGenerating || !query.trim()} className="gap-2 shrink-0">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? 'Generating…' : 'Generate'}
              </Button>
            </div>
            {/* Example queries */}
            {!roadmap && !isGenerating && (
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_QUERIES.map(q => (
                  <button
                    key={q}
                    onClick={() => { setQuery(q); }}
                    className="text-xs text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-full px-2.5 py-1 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Generating state */}
          {isGenerating && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Generating your roadmap for "{query}"…</p>
                  <p className="text-xs text-muted-foreground">Using AI to create a structured learning path</p>
                </div>
              </div>
              {streamText && (
                <div className="px-4 py-3 rounded-xl bg-secondary/50 font-mono text-xs text-muted-foreground max-h-40 overflow-y-auto leading-relaxed">
                  {streamText.slice(-800)}
                  <span className="animate-pulse">▌</span>
                </div>
              )}
            </div>
          )}

          {/* Roadmap display */}
          {roadmap && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Header card */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h2 className="font-heading text-xl font-bold text-foreground">{roadmap.topic}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{roadmap.totalDuration}</span>
                        <Badge variant={roadmap.difficulty === 'Beginner' ? 'success' : roadmap.difficulty === 'Advanced' ? 'destructive' : 'default'}>
                          {roadmap.difficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{roadmap.phases.length} phases</span>
                      </div>
                    </div>
                    <button onClick={() => { setRoadmap(null); setQuery('') }} className="text-muted-foreground hover:text-foreground text-xs">
                      New →
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{roadmap.overview}</p>

                  {roadmap.prerequisites.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Prerequisites</p>
                      <div className="flex flex-wrap gap-1.5">
                        {roadmap.prerequisites.map(p => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Phase cards */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Learning Phases</p>
                <div className="space-y-2">
                  {roadmap.phases.map((phase, i) => (
                    <PhaseCard key={i} phase={phase} index={i} />
                  ))}
                </div>
              </div>

              {/* Tools + Communities */}
              <div className="grid grid-cols-2 gap-4">
                {roadmap.tools.length > 0 && (
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">🔧 Tools</p>
                      <div className="space-y-1">
                        {roadmap.tools.map(t => <p key={t} className="text-xs text-foreground">· {t}</p>)}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {roadmap.communities.length > 0 && (
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">🌐 Communities</p>
                      <div className="space-y-1">
                        {roadmap.communities.map(c => <p key={c} className="text-xs text-foreground">· {c}</p>)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Save CTA */}
              {!saved && (
                <div className="flex items-center justify-center gap-3 py-4 border border-dashed border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">Save this roadmap as a note in</p>
                  <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">markdownlod/roadmaps/</code>
                  <Button size="sm" onClick={saveAsNote} disabled={isSaving} className="gap-1.5">
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                </div>
              )}
              {saved && (
                <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <p className="text-sm text-green-400">Saved to GitHub → markdownlod/roadmaps/</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Empty state */}
          {!roadmap && !isGenerating && !error && (
            <div className="text-center py-16 space-y-3">
              <div className="text-5xl">🗺️</div>
              <h3 className="font-heading text-lg font-semibold text-foreground">Generate a Learning Roadmap</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Type any skill or topic above. AI will generate a structured, phase-by-phase roadmap with real resources — then save it as a note to GitHub.
              </p>
              {!apiKey && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 inline-flex items-center gap-2 text-sm text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  Add your OpenRouter API key in Settings to use this feature
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
