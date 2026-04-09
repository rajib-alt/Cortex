import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Trash2, RotateCcw, CheckCircle2, ChevronDown,
  ChevronRight, Star, Flame, AlertCircle, Edit2, ExternalLink,
  GraduationCap, Brain, Layers
} from 'lucide-react'
import {
  useLearningStore, LearningItem, LearningCategory, LearningStatus,
  CATEGORY_CONFIG, STATUS_COLORS
} from '@/store/learningStore'
import {
  Button, Input, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Card, CardHeader, CardTitle, CardContent,
  Progress, Separator
} from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

// ─── Add / Edit Modal ────────────────────────────────────────────────────────
function ItemModal({ open, onClose, editItem }: { open: boolean; onClose: () => void; editItem?: LearningItem | null }) {
  const { addItem, updateItem } = useLearningStore()
  const [form, setForm] = useState<Partial<LearningItem>>(() => editItem || {
    title: '', content: '', source: '', category: 'other', status: 'new', tags: [],
  })

  const submit = () => {
    if (!form.title?.trim() || !form.content?.trim()) return
    if (editItem) updateItem(editItem.id, form)
    else addItem(form as any)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Learning Item' : 'Add Something You Learned'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title / concept…" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          <Textarea
            placeholder="Write out what you learned in your own words… (Feynman technique: explain it simply)"
            value={form.content || ''}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            className="min-h-[120px]"
          />
          <Input placeholder="Source (book, URL, course…)" value={form.source || ''} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as LearningCategory }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Tags (comma-separated)</label>
              <Input
                className="h-8 text-xs"
                placeholder="tag1, tag2"
                value={(form.tags || []).join(', ')}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
              />
            </div>
          </div>
          <Button className="w-full" onClick={submit}>{editItem ? 'Save Changes' : 'Add to Library'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Review Session ───────────────────────────────────────────────────────────
function ReviewSession({ items, onDone }: { items: LearningItem[]; onDone: () => void }) {
  const { reviewItem } = useLearningStore()
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState<string[]>([])

  const current = items[idx]
  const progress = Math.round((idx / items.length) * 100)

  if (!current || idx >= items.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-6xl">🎉</div>
          <h2 className="font-heading text-2xl font-bold">Session Complete!</h2>
          <p className="text-muted-foreground">You reviewed {reviewed.length} item{reviewed.length !== 1 ? 's' : ''}. Great work!</p>
          <Button onClick={onDone}>Back to Library</Button>
        </div>
      </div>
    )
  }

  const handleQuality = (q: 0 | 1 | 2 | 3 | 4 | 5) => {
    reviewItem(current.id, q)
    setReviewed(r => [...r, current.id])
    setRevealed(false)
    setIdx(i => i + 1)
  }

  const catCfg = CATEGORY_CONFIG[current.category]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="px-6 pt-4 shrink-0">
        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
          <span>{idx + 1} / {items.length}</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-lg"
          >
            {/* Meta */}
            <div className="flex items-center gap-2 mb-4">
              <span className={cn('text-sm font-medium', catCfg.color)}>{catCfg.emoji} {catCfg.label}</span>
              {current.tags.length > 0 && current.tags.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
              <span className="ml-auto text-xs text-muted-foreground">Review #{current.reviewCount + 1}</span>
            </div>

            {/* Title (always shown) */}
            <h3 className="font-heading text-xl font-semibold text-foreground mb-2">{current.title}</h3>
            {current.source && (
              <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> {current.source}
              </p>
            )}

            {/* Reveal content */}
            {!revealed ? (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground text-center italic">Think about what you know about this topic…</p>
                <Button className="w-full mt-4" variant="outline" onClick={() => setRevealed(true)}>
                  Reveal Notes ↓
                </Button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                <Separator className="mb-4" />
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{current.content}</p>
              </motion.div>
            )}
          </motion.div>

          {/* Rating buttons (shown after reveal) */}
          {revealed && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs text-muted-foreground text-center mb-3">How well did you remember?</p>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { q: 1, label: 'Forgot', color: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/20' },
                  { q: 2, label: 'Hard',   color: 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-orange-500/20' },
                  { q: 3, label: 'OK',     color: 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border-yellow-500/20' },
                  { q: 5, label: 'Easy',   color: 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/20' },
                ] as const).map(({ q, label, color }) => (
                  <button
                    key={q}
                    onClick={() => handleQuality(q as 0 | 1 | 2 | 3 | 4 | 5)}
                    className={cn('py-3 px-2 rounded-xl border text-sm font-medium transition-all active:scale-95', color)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">Your next review will be scheduled automatically</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Library Item Row ─────────────────────────────────────────────────────────
function LibraryItem({ item, onEdit }: { item: LearningItem; onEdit: () => void }) {
  const { deleteItem, reviewItem } = useLearningStore()
  const [expanded, setExpanded] = useState(false)
  const catCfg = CATEGORY_CONFIG[item.category]
  const today = new Date().toISOString().split('T')[0]
  const isDue = item.nextReviewDate <= today && item.status !== 'mastered'

  return (
    <div className={cn('border rounded-xl transition-colors bg-card', isDue ? 'border-primary/30' : 'border-border')}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(s => !s)}
      >
        <span className="text-lg shrink-0">{catCfg.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={cn('text-[10px]', STATUS_COLORS[item.status])}>{item.status}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{item.reviewCount} reviews</span>
            {isDue && <Badge variant="default" className="text-[9px] h-3.5 px-1.5">Due today</Badge>}
            {item.status === 'mastered' && <span className="text-[10px] text-green-400">✓ mastered</span>}
          </div>
        </div>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{item.content}</p>
              {item.source && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />{item.source}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Next review: {item.nextReviewDate}</span>
                <span>·</span>
                <span>Interval: {item.interval}d</span>
                <span>·</span>
                <span>Ease: {item.ease.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5"><Edit2 className="h-3 w-3" />Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)} className="gap-1.5"><Trash2 className="h-3 w-3" />Delete</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Learning View ───────────────────────────────────────────────────────
export default function LearningView() {
  const { items, getDueToday, getStats } = useLearningStore()
  const [mode, setMode] = useState<'library' | 'review'>('library')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<LearningItem | null>(null)
  const [catFilter, setCatFilter] = useState<LearningCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<LearningStatus | 'all'>('all')
  const [searchQ, setSearchQ] = useState('')

  const stats = getStats()
  const dueItems = getDueToday()

  const filtered = useMemo(() => {
    return items
      .filter(i => catFilter === 'all' || i.category === catFilter)
      .filter(i => statusFilter === 'all' || i.status === statusFilter)
      .filter(i => !searchQ || i.title.toLowerCase().includes(searchQ.toLowerCase()) || i.content.toLowerCase().includes(searchQ.toLowerCase()))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [items, catFilter, statusFilter, searchQ])

  if (mode === 'review') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
          <GraduationCap className="h-4 w-4 text-teal-400" />
          <span className="font-heading font-semibold text-sm flex-1">Review Session — {dueItems.length} items due</span>
          <Button size="sm" variant="ghost" onClick={() => setMode('library')}>← Back to Library</Button>
        </div>
        {dueItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="font-heading text-lg font-semibold">All caught up!</h3>
              <p className="text-sm text-muted-foreground mt-1">No reviews due today. Come back tomorrow!</p>
              <Button className="mt-4" onClick={() => setMode('library')}>Back to Library</Button>
            </div>
          </div>
        ) : (
          <ReviewSession items={dueItems} onDone={() => setMode('library')} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <GraduationCap className="h-4 w-4 text-teal-400" />
        <span className="font-heading font-semibold text-sm flex-1">Learning Library</span>
        {dueItems.length > 0 && (
          <Button size="sm" variant="default" onClick={() => setMode('review')} className="gap-1.5">
            <Brain className="h-3.5 w-3.5" />Review {dueItems.length} due
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => { setEditItem(null); setShowModal(true) }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />Add Learning
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total',    value: stats.total,    emoji: '📚', color: 'text-foreground' },
              { label: 'Due Today', value: stats.dueToday, emoji: '⏰', color: stats.dueToday > 0 ? 'text-yellow-400' : 'text-foreground' },
              { label: 'Mastered', value: stats.mastered,  emoji: '⭐', color: 'text-green-400' },
              { label: 'Learning', value: items.filter(i => i.status === 'learning').length, emoji: '🔄', color: 'text-blue-400' },
            ].map(s => (
              <Card key={s.label} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className={cn('font-heading text-2xl font-bold mt-0.5', s.color)}>{s.value}</p>
                  </div>
                  <span className="text-2xl">{s.emoji}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <Input placeholder="Search…" value={searchQ} onChange={e => setSearchQ(e.target.value)} className="h-8 w-48 text-xs" />
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setCatFilter('all')} className={cn('px-2.5 py-1 rounded-full text-xs transition-colors', catFilter === 'all' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary')}>All</button>
              {(Object.entries(CATEGORY_CONFIG) as [LearningCategory, any][]).map(([k, v]) => (
                <button key={k} onClick={() => setCatFilter(k)} className={cn('px-2.5 py-1 rounded-full text-xs transition-colors flex items-center gap-1', catFilter === k ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary')}>
                  {v.emoji}{v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {(['all', 'new', 'learning', 'review', 'mastered'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-2.5 py-1 rounded-full text-xs capitalize transition-colors', statusFilter === s ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary')}>
                {s}
              </button>
            ))}
          </div>

          {/* Items list */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No items yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add something you've learned — books, articles, concepts.</p>
              <Button size="sm" className="mt-4" onClick={() => { setEditItem(null); setShowModal(true) }}>Add First Item</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.map(item => (
                  <LibraryItem key={item.id} item={item} onEdit={() => { setEditItem(item); setShowModal(true) }} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <ItemModal open={showModal} onClose={() => { setShowModal(false); setEditItem(null) }} editItem={editItem} />
    </div>
  )
}
