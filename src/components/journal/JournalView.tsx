import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, Search, Trash2, Lock, Hash, Heart, Target, Edit3, BarChart2 } from 'lucide-react'
import { useJournalStore, JournalEntry, Mood, MOOD_CONFIG } from '@/store/journalStore'
import { Button, Input, Badge, Textarea } from '@/components/ui'
import { cn, formatDate, todayISO } from '@/lib/utils'
import JournalHeatmap from './JournalHeatmap'

// ─── Mood Picker ─────────────────────────────────────────────────────────────
function MoodPicker({ value, onChange }: { value?: Mood; onChange: (m: Mood) => void }) {
  return (
    <div className="flex gap-2">
      {([1, 2, 3, 4, 5] as Mood[]).map(m => {
        const cfg = MOOD_CONFIG[m]
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={cn(
              'text-xl transition-all rounded-lg p-1',
              value === m ? 'scale-125 bg-secondary' : 'opacity-50 hover:opacity-100 hover:scale-110'
            )}
            title={cfg.label}
          >
            {cfg.emoji}
          </button>
        )
      })}
    </div>
  )
}

// ─── Entry List Item ──────────────────────────────────────────────────────────
function EntryListItem({ entry, isActive, onClick }: { entry: JournalEntry; isActive: boolean; onClick: () => void }) {
  const cfg = entry.mood ? MOOD_CONFIG[entry.mood] : null
  const preview = entry.content.replace(/#{1,6}\s/g, '').slice(0, 80)
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg transition-colors group',
        isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary'
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-medium text-foreground">{formatDate(entry.date, 'short')}</span>
        {cfg && <span className="text-sm">{cfg.emoji}</span>}
      </div>
      <p className="text-xs text-muted-foreground truncate">{preview || 'Empty entry…'}</p>
      {entry.tags.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {entry.tags.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-[9px] h-3 px-1">{t}</Badge>)}
        </div>
      )}
    </button>
  )
}

// ─── Main Journal Component ───────────────────────────────────────────────────
export default function JournalView() {
  const { entries, addEntry, updateEntry, deleteEntry, getOrCreateToday, searchEntries } = useJournalStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [view, setView] = useState<'list' | 'heatmap'>('list')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // auto-open today on mount
  useEffect(() => {
    const today = getOrCreateToday()
    setActiveId(today.id)
  }, [])

  const activeEntry = entries.find(e => e.id === activeId)
  const displayEntries = searchQ ? searchEntries(searchQ) : entries

  const update = (updates: Partial<JournalEntry>) => {
    if (!activeId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    updateEntry(activeId, updates)
  }

  const newEntry = () => {
    const today = todayISO()
    const existing = entries.find(e => e.date === today)
    if (existing) { setActiveId(existing.id); return }
    const id = addEntry({
      date: today,
      title: `Journal — ${formatDate(today, 'long')}`,
      content: '',
      tags: [],
      gratitude: [],
      intentions: [],
    })
    setActiveId(id)
  }

  const addListItem = (field: 'gratitude' | 'intentions', text: string) => {
    if (!activeEntry || !text.trim()) return
    update({ [field]: [...activeEntry[field], text.trim()] })
  }

  const removeListItem = (field: 'gratitude' | 'intentions', idx: number) => {
    if (!activeEntry) return
    const arr = [...activeEntry[field]]
    arr.splice(idx, 1)
    update({ [field]: arr })
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-60 shrink-0 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <span className="text-xs font-heading font-semibold text-foreground flex-1">Journal</span>
          <Button size="icon-sm" variant={view === 'heatmap' ? 'secondary' : 'ghost'} onClick={() => setView(v => v === 'heatmap' ? 'list' : 'heatmap')} title="Heatmap"><BarChart2 className="h-3.5 w-3.5" /></Button>
          <Button size="icon-sm" variant="ghost" onClick={newEntry} title="New entry"><Edit3 className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input className="h-7 pl-6 text-xs" placeholder="Search…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {displayEntries.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No entries yet.<br/>Start writing today.</p>
          )}
          {displayEntries.map(e => (
            <EntryListItem key={e.id} entry={e} isActive={activeId === e.id} onClick={() => setActiveId(e.id)} />
          ))}
        </div>
      </div>

      {/* Editor */}
      {activeEntry ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-3 border-b border-border flex items-center gap-4">
            <div className="flex-1">
              <input
                className="bg-transparent font-heading text-lg font-semibold text-foreground outline-none w-full"
                value={activeEntry.title}
                onChange={e => update({ title: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {formatDate(activeEntry.date, 'long')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <MoodPicker value={activeEntry.mood} onChange={mood => update({ mood })} />
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => { deleteEntry(activeEntry.id); setActiveId(entries.find(e => e.id !== activeEntry.id)?.id || null) }}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-4 space-y-6">
              {/* Gratitude */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-3.5 w-3.5 text-pink-400" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grateful for</h3>
                </div>
                <div className="space-y-1.5">
                  {activeEntry.gratitude.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 group">
                      <span className="text-xs text-muted-foreground">✦</span>
                      <span className="flex-1 text-sm text-foreground">{g}</span>
                      <button onClick={() => removeListItem('gratitude', i)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                  <AddItemInput placeholder="Add something you're grateful for…" onAdd={t => addListItem('gratitude', t)} />
                </div>
              </section>

              {/* Intentions */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-3.5 w-3.5 text-blue-400" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intentions today</h3>
                </div>
                <div className="space-y-1.5">
                  {activeEntry.intentions.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 group">
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="flex-1 text-sm text-foreground">{g}</span>
                      <button onClick={() => removeListItem('intentions', i)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                  <AddItemInput placeholder="Set an intention…" onAdd={t => addListItem('intentions', t)} />
                </div>
              </section>

              {/* Main content */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Edit3 className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thoughts & reflections</h3>
                </div>
                <Textarea
                  value={activeEntry.content}
                  onChange={e => update({ content: e.target.value })}
                  placeholder="Write freely… What's on your mind? What happened today? How do you feel?"
                  className="min-h-[300px] text-sm leading-relaxed bg-transparent border-dashed"
                />
              </section>

              {/* Tags */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h3>
                </div>
                <TagsInput value={activeEntry.tags} onChange={tags => update({ tags })} />
              </section>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Edit3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Select an entry or start today's journal</p>
            <Button size="sm" className="mt-3" onClick={newEntry}>Open Today's Journal</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddItemInput({ placeholder, onAdd }: { placeholder: string; onAdd: (t: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <input
      className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/60 text-foreground py-0.5"
      placeholder={placeholder}
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal('') } }}
    />
  )
}

function TagsInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = (t: string) => { if (t && !value.includes(t)) onChange([...value, t]) }
  const remove = (t: string) => onChange(value.filter(x => x !== t))
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {value.map(t => (
        <Badge key={t} variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => remove(t)}>
          #{t} ×
        </Badge>
      ))}
      <input
        className="text-xs bg-transparent outline-none placeholder:text-muted-foreground min-w-[80px]"
        placeholder="Add tag…"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
            add(input.trim().replace(/^#/, ''))
            setInput('')
            e.preventDefault()
          }
          if (e.key === 'Backspace' && !input && value.length > 0) remove(value[value.length - 1])
        }}
      />
    </div>
  )
}
