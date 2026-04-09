import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, X, Loader2, ChevronDown, Bot, User } from 'lucide-react'
import { useBlocksStore } from '@/store/blocksStore'
import { useNotesStore } from '@/store/notesStore'
import { useJournalStore } from '@/store/journalStore'
import { useFinanceStore } from '@/store/financeStore'
import { useTasksStore } from '@/store/tasksStore'
import { Button, Input } from '@/components/ui'
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
  const [modelKey, setModelKey] = useState(() => localStorage.getItem('cortex-openrouter-key') || '')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { spaces } = useBlocksStore()
  const { entries } = useJournalStore()
  const { getMonthlyData, currency } = useFinanceStore()
  const { tasks } = useTasksStore()

  const now = new Date()
  const monthly = getMonthlyData(now.getFullYear(), now.getMonth() + 1)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const userMsg = (text || input).trim()
    if (!userMsg) return
    if (!modelKey) { setShowKeyInput(true); return }

    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const systemPrompt = buildSystemContext(spaces, entries, monthly, tasks, currency)
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${modelKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Cortex OS',
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

      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: '⚠️ Error connecting to AI. Check your API key.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const saveKey = () => {
    localStorage.setItem('cortex-openrouter-key', modelKey)
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
            <span className="font-heading font-semibold text-sm flex-1">AI Assistant</span>
            <button onClick={() => setShowKeyInput(s => !s)} className="text-muted-foreground hover:text-foreground text-xs">⚙️</button>
            <Button size="icon-sm" variant="ghost" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
          </div>

          {/* API key input */}
          {showKeyInput && (
            <div className="p-3 border-b border-border bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-2">OpenRouter API key</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-xs px-2 py-1.5 rounded bg-background border border-border outline-none"
                  placeholder="sk-or-…"
                  value={modelKey}
                  onChange={e => setModelKey(e.target.value)}
                  type="password"
                />
                <Button size="sm" onClick={saveKey}>Save</Button>
              </div>
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline mt-1 block">Get a free key →</a>
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
