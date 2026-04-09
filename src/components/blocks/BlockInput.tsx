import { useState, useRef, useEffect } from 'react'
import { Send, Zap } from 'lucide-react'
import { BlockType, BLOCK_TYPE_CONFIG, useBlocksStore } from '@/store/blocksStore'
import { cn } from '@/lib/utils'

const TYPE_SHORTCUTS: Record<string, BlockType> = {
  '/idea': 'idea', '/claim': 'claim', '/q': 'question', '/task': 'task',
  '/quote': 'quote', '/def': 'definition', '/reflect': 'reflection',
  '/learn': 'learning', '/ref': 'reference', '/goal': 'goal',
  '/win': 'win', '/decide': 'decision', '/thesis': 'thesis',
}

export default function BlockInput() {
  const { addBlock, getActiveSpace } = useBlocksStore()
  const [text, setText] = useState('')
  const [detectedType, setDetectedType] = useState<BlockType>('general')
  const [showHints, setShowHints] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const lower = text.toLowerCase()
    const matched = Object.entries(TYPE_SHORTCUTS).find(([key]) => lower.startsWith(key + ' '))
    if (matched) setDetectedType(matched[1])
    else if (lower.startsWith('?')) setDetectedType('question')
    else if (lower.startsWith('"') || lower.startsWith('"')) setDetectedType('quote')
    else if (/^(learn|studied|reading)/i.test(text)) setDetectedType('learning')
    else if (/^(won|achieved|completed)/i.test(text)) setDetectedType('win')
    else if (/^(decided|chose|going with)/i.test(text)) setDetectedType('decision')
    else setDetectedType('general')
  }, [text])

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const lower = trimmed.toLowerCase()
    const matched = Object.entries(TYPE_SHORTCUTS).find(([key]) => lower.startsWith(key + ' '))
    let finalText = trimmed
    let finalType: BlockType = detectedType
    if (matched) {
      finalType = matched[1]
      finalText = trimmed.slice(matched[0].length + 1).trim()
    }
    addBlock(finalText, finalType)
    setText('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
  }

  const cfg = BLOCK_TYPE_CONFIG[detectedType]
  const space = getActiveSpace()

  return (
    <div className="sticky bottom-0 z-10 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
      {/* Shortcuts hint */}
      {showHints && (
        <div className="mb-2 p-3 rounded-xl bg-card border border-border grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {Object.entries(TYPE_SHORTCUTS).map(([key, type]) => {
            const c = BLOCK_TYPE_CONFIG[type]
            return (
              <button
                key={key}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                onClick={() => { setText(key + ' '); textareaRef.current?.focus() }}
              >
                <span>{c.emoji}</span>
                <code className="font-mono text-[10px] text-primary">{key}</code>
                <span>{c.label}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-end gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        {/* Type indicator */}
        <span className={cn('text-xl shrink-0 transition-all', cfg.color)} title={cfg.label}>{cfg.emoji}</span>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
            if (e.key === '/' && text === '') setShowHints(s => !s)
          }}
          placeholder={`Capture a thought in ${space?.name || 'your space'}… (/ for shortcuts)`}
          rows={1}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
          style={{ minHeight: '1.5rem', maxHeight: '200px' }}
        />

        {/* Hints toggle */}
        <button
          onClick={() => setShowHints(s => !s)}
          className={cn(
            'shrink-0 h-7 w-7 rounded-md flex items-center justify-center transition-colors',
            showHints ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <Zap className="h-3.5 w-3.5" />
        </button>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="shrink-0 h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground mt-1.5">↵ capture · shift+↵ newline · / for type shortcuts</p>
    </div>
  )
}
