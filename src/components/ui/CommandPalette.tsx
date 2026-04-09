import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Brain, FileText, Edit3, DollarSign, CheckSquare, Home,
  Plus, Zap, BookOpen, Hash, ArrowRight, Command
} from 'lucide-react'
import { useBlocksStore } from '@/store/blocksStore'
import { useNotesStore } from '@/store/notesStore'
import { useJournalStore } from '@/store/journalStore'
import { useTasksStore } from '@/store/tasksStore'
import { cn, truncate } from '@/lib/utils'

interface CommandItem {
  id: string
  type: 'nav' | 'note' | 'block' | 'journal' | 'task' | 'action'
  title: string
  subtitle?: string
  icon: any
  iconColor?: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (tab: string) => void
}

export default function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { spaces, getActiveSpace, addBlock } = useBlocksStore()
  const { getAllNotes, loadFile } = useNotesStore()
  const { entries } = useJournalStore()
  const { tasks } = useTasksStore()

  useEffect(() => {
    if (open) { setQuery(''); setActiveIdx(0); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  const allItems = useMemo((): CommandItem[] => {
    const items: CommandItem[] = []

    // Navigation
    const navItems = [
      { tab: 'home',     icon: Home,        label: 'Dashboard',  color: 'text-foreground' },
      { tab: 'thoughts', icon: Brain,       label: 'Thoughts',   color: 'text-yellow-400' },
      { tab: 'notes',    icon: FileText,    label: 'Notes',      color: 'text-blue-400' },
      { tab: 'journal',  icon: Edit3,       label: 'Journal',    color: 'text-pink-400' },
      { tab: 'finance',  icon: DollarSign,  label: 'Finance',    color: 'text-primary' },
      { tab: 'tasks',    icon: CheckSquare, label: 'Tasks',      color: 'text-green-400' },
    ]
    for (const n of navItems) {
      items.push({ id: `nav:${n.tab}`, type: 'nav', title: `Go to ${n.label}`, icon: n.icon, iconColor: n.color, action: () => { onNavigate(n.tab); onClose() } })
    }

    // Notes
    for (const note of getAllNotes().slice(0, 20)) {
      items.push({
        id: `note:${note.path}`, type: 'note',
        title: note.name.replace('.md', ''), subtitle: note.path,
        icon: FileText, iconColor: 'text-blue-400',
        action: () => { loadFile(note.path); onNavigate('notes'); onClose() }
      })
    }

    // Blocks
    const allBlocks = spaces.flatMap(sp => sp.blocks.map(b => ({ ...b, spaceName: sp.name })))
    for (const block of allBlocks.slice(0, 20)) {
      items.push({
        id: `block:${block.id}`, type: 'block',
        title: truncate(block.text, 60), subtitle: `${block.type} · ${block.spaceName}`,
        icon: Brain, iconColor: 'text-yellow-400',
        action: () => { onNavigate('thoughts'); onClose() }
      })
    }

    // Journal entries
    for (const entry of entries.slice(0, 10)) {
      items.push({
        id: `journal:${entry.id}`, type: 'journal',
        title: entry.title, subtitle: entry.date,
        icon: Edit3, iconColor: 'text-pink-400',
        action: () => { onNavigate('journal'); onClose() }
      })
    }

    // Tasks
    for (const task of tasks.slice(0, 15)) {
      items.push({
        id: `task:${task.id}`, type: 'task',
        title: task.title, subtitle: `${task.category} · ${task.status}`,
        icon: CheckSquare, iconColor: 'text-green-400',
        action: () => { onNavigate('tasks'); onClose() }
      })
    }

    return items
  }, [spaces, getAllNotes, entries, tasks])

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems.filter(i => i.type === 'nav').slice(0, 8)
    const q = query.toLowerCase()
    return allItems.filter(i =>
      i.title.toLowerCase().includes(q) || i.subtitle?.toLowerCase().includes(q)
    ).slice(0, 12)
  }, [allItems, query])

  // Quick capture mode: start with >
  const isCapture = query.startsWith('>')
  const captureText = isCapture ? query.slice(1).trim() : ''

  useEffect(() => { setActiveIdx(0) }, [filtered])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isCapture && captureText) {
        addBlock(captureText)
        onNavigate('thoughts')
        onClose()
      } else {
        filtered[activeIdx]?.action()
      }
    }
    if (e.key === 'Escape') onClose()
  }

  const typeLabel: Record<string, string> = { nav: 'Navigate', note: 'Note', block: 'Thought', journal: 'Journal', task: 'Task' }
  const grouped = filtered.reduce((acc, item) => {
    const group = typeLabel[item.type] || item.type
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {} as Record<string, CommandItem[]>)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[20%] z-50 -translate-x-1/2 w-full max-w-xl"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search notes, thoughts, tasks… or › to capture"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                {isCapture && captureText && (
                  <span className="text-xs text-primary shrink-0">↵ capture thought</span>
                )}
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
                {Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5 font-medium">{group}</p>
                    {items.map(item => {
                      const globalIdx = filtered.indexOf(item)
                      const isActive = globalIdx === activeIdx
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setActiveIdx(globalIdx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                            isActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-secondary'
                          )}
                        >
                          <item.icon className={cn('h-4 w-4 shrink-0', item.iconColor)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{item.title}</p>
                            {item.subtitle && <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>}
                          </div>
                          {isActive && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                ))}
                {filtered.length === 0 && !isCapture && (
                  <div className="py-8 text-center text-sm text-muted-foreground">No results for "{query}"</div>
                )}
                {isCapture && (
                  <div className="px-3 py-4 flex items-center gap-3">
                    <Brain className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-sm text-foreground">Capture: "{captureText || '…'}"</p>
                      <p className="text-xs text-muted-foreground">Press Enter to add to Thoughts</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-4 py-2 flex gap-4 text-[10px] text-muted-foreground">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>› capture thought</span>
                <span>Esc close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
