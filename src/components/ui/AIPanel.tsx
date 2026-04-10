import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, X, Loader2, ChevronDown, Bot, User } from 'lucide-react'
import { useBlocksStore } from '@/store/blocksStore'
import { useNotesStore } from '@/store/notesStore'
import { useJournalStore } from '@/store/journalStore'
import { useFinanceStore } from '@/store/financeStore'
import { useTasksStore } from '@/store/tasksStore'
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  'Summarize my recent thoughts',
  'What patterns do you see in my journal?',
  'Review my finances this month',
  'What are my overdue tasks?',
  'Help me plan my week',
  'What should I focus on today?',
]

function buildSystemContext(
  blocks: ReturnType<typeof useBlocksStore.getState>['spaces'],
  entries: ReturnType<typeof useJournalStore.getState>['entries'],
  monthly: { income: number; expense: number; net: number },
  tasks: ReturnType<typeof useTasksStore.getState>['tasks'],
  currency: string
): string {
  const recentBlocks = blocks.flatMap(sp => sp.blocks).sort((a, b) => b.createdAt - a.createdAt).slice(0, 15)
  const recentJournal = entries.slice(0, 5)
  const activeTasks = tasks.filter(t => t.status === 'active').slice(0, 10)

  return `You are a personal AI assistant for the user's "Second Brain" — Cortex OS. You have access to their knowledge base.

RECENT THOUGHTS (${recentBlocks.length}):
${recentBlocks.map(b => `- [${b.type}] ${b.text.slice(0, 100)}`).join('\n')}

JOURNAL ENTRIES (last ${recentJournal.length}):
${recentJournal.map(e => `- ${e.date}: "${e.title}" — mood: ${e.mood || 'unset'} | ${e.content.slice(0, 80)}`).join('\n')}

TASKS (active ${activeTasks.length}):
${activeTasks.map(t => `- [${t.priority}] ${t.title} (${t.category}, due: ${t.dueDate || 'none'})`).join('\n')}

FINANCES THIS MONTH:
- Income: ${monthly.income.toLocaleString()} ${currency}
- Expenses: ${monthly.expense.toLocaleString()} ${currency}
- Net: ${monthly.net.toLocaleString()} ${currency}

Be concise, insightful, and personal. Reference specific items from their data. Keep responses under 200 words unless asked for more.`
}

interface AIPanelProps {
  open: boolean
  onClose: () => void
}

export default function AIPanel({ open, onClose }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [provider, setProvider] = useState<'openrouter' | 'gemini'>('openrouter')
  const [localKey, setLocalKey] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const notesStore = useNotesStore()
  const { spaces } = useBlocksStore()
  const { entries } = useJournalStore()
  const { getMonthlyData, currency } = useFinanceStore()
  const { tasks } = useTasksStore()

  useEffect(() => {
    setProvider(notesStore.aiProvider || 'openrouter')
    setLocalKey(notesStore.aiProvider === 'gemini' ? notesStore.geminiKey : notesStore.openRouterKey)
  }, [notesStore.aiProvider, notesStore.geminiKey, notesStore.openRouterKey])

  const now = new Date()
  const monthly = getMonthlyData(now.getFullYear(), now.getMonth() + 1)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const userMsg = (text || input).trim()
    if (!userMsg) return
    if (!localKey) { setShowKeyInput(true); return }

    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const systemPrompt = buildSystemContext(spaces, entries, monthly, tasks, currency)
      let reply = 'Sorry, I could not generate a response.'

      if (provider === 'gemini') {
        const res = await fetch('https://gemini.googleapis.com/v1/models/chat-bison-001:generate', {
          method: 'POST',
          mode: 'cors',
          cache: 'no-cache',
          redirect: 'follow',
          headers: {
            'Authorization': `Bearer ${localKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            instances: [
              {
                content: [
                  { type: 'text', text: systemPrompt },
                  ...newMessages.slice(-8).map(m => ({ type: 'text', text: `${m.role === 'user' ? 'User:' : 'Assistant:'} ${m.content}` })),
                ],
              },
            ],
            parameters: { temperature: 0.7, max_output_tokens: 400 },
          }),
        })

        if (!res.ok) {
          const bodyText = await res.text().catch(() => '')
          throw new Error(`Gemini API error: ${res.status}${bodyText ? ` — ${bodyText}` : ''}`)
        }

        const data = await res.json()
        const candidate = data?.candidates?.[0]
        if (candidate?.content) {
          reply = candidate.content.map((part: any) => part.text || '').join('')
        } else if (data?.candidates?.[0]?.output?.[0]?.content) {
          reply = data.candidates[0].output[0].content.map((part: any) => part.text || '').join('')
        }
      } else {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          mode: 'cors',
          cache: 'no-cache',
          redirect: 'follow',
          headers: {
            'Authorization': `Bearer ${localKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            model: 'stepfun/step-3.5-flash:free',
            messages: [
              { role: 'system', content: systemPrompt },
              ...newMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
            ],
            max_tokens: 400,
            temperature: 0.7,
          }),
        })

        if (!res.ok) {
          const bodyText = await res.text().catch(() => '')
          throw new Error(`OpenRouter API error: ${res.status}${bodyText ? ` — ${bodyText}` : ''}`)
        }

        const data = await res.json()
        reply = data.choices?.[0]?.message?.content || reply
      }

      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: '⚠️ Error connecting to AI. Check your API key.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const saveKey = () => {
    if (provider === 'gemini') {
      notesStore.setGeminiKey(localKey)
    } else {
      notesStore.setOpenRouterKey(localKey)
    }
    notesStore.setAIProvider(provider)
    setShowKeyInput(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed right-0 top-0 h-full w-80 z-40 flex flex-col bg-card border-l border-border shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <div className="font-heading font-semibold text-sm">AI Assistant</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Provider: {provider === 'gemini' ? 'Gemini' : 'OpenRouter'}</div>
            </div>
            <button onClick={() => setShowKeyInput(s => !s)} className="text-muted-foreground hover:text-foreground text-xs">⚙️</button>
            <Button size="icon-sm" variant="ghost" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
          </div>

          {/* API key input */}
          {showKeyInput && (
            <div className="p-3 border-b border-border bg-secondary/50 space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">AI provider</p>
                <Select value={provider} onValueChange={v => setProvider(v as 'openrouter' | 'gemini')}>
                  <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground">Note: Gemini often does not work directly from the browser due to CORS restrictions. OpenRouter is more reliable for in-browser AI.</p>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{provider === 'gemini' ? 'Gemini API key' : 'OpenRouter API key'}</p>
                <input
                  className="w-full text-xs px-2 py-1.5 rounded bg-background border border-border outline-none"
                  placeholder={provider === 'gemini' ? 'Gemini key' : 'sk-or-…'}
                  value={localKey}
                  onChange={e => setLocalKey(e.target.value)}
                  type="password"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveKey}>Save</Button>
              </div>
              {provider === 'openrouter' ? (
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline block">Get a free OpenRouter API key →</a>
              ) : (
                <p className="text-[10px] text-muted-foreground">Use your Gemini API key to power the assistant.</p>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/50">
                  <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Hi! I'm your AI assistant. I have context from your thoughts, journal, tasks, and finances. Ask me anything.
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Quick prompts</p>
                  <div className="space-y-1.5">
                    {QUICK_PROMPTS.map(p => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        className="w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg px-3 py-2 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex items-start gap-2', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                <div className={cn('h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs', msg.role === 'user' ? 'bg-primary/20' : 'bg-secondary')}>
                  {msg.role === 'user' ? <User className="h-3 w-3 text-primary" /> : <Bot className="h-3 w-3 text-muted-foreground" />}
                </div>
                <div className={cn('max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed', msg.role === 'user' ? 'bg-primary/15 text-foreground' : 'bg-secondary text-foreground')}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">Thinking…</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Clear */}
          {messages.length > 0 && (
            <div className="px-3 pb-1">
              <button onClick={() => setMessages([])} className="text-[10px] text-muted-foreground hover:text-foreground w-full text-center">Clear conversation</button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border shrink-0">
            <div className="flex gap-2">
              <input
                className="flex-1 text-xs px-3 py-2 rounded-xl bg-secondary border border-border outline-none placeholder:text-muted-foreground"
                placeholder="Ask anything about your data…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              />
              <Button size="icon-sm" onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
