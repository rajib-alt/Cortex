import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Pin, Trash2, MoreHorizontal, Check, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Block, BLOCK_TYPE_CONFIG, useBlocksStore } from '@/store/blocksStore'
import { Badge, Button, Checkbox } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

interface BlockCardProps {
  block: Block
  spaceId: string
  isCollapsed?: boolean
  compact?: boolean
}

export default function BlockCard({ block, spaceId, isCollapsed = false, compact = false }: BlockCardProps) {
  const { updateBlock, deleteBlock, togglePin, toggleCollapse, addSubTask, toggleSubTask, deleteSubTask } = useBlocksStore()
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(block.text)
  const [showSubTaskInput, setShowSubTaskInput] = useState(false)
  const [subTaskText, setSubTaskText] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const cfg = BLOCK_TYPE_CONFIG[block.type]

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.focus()
      textRef.current.style.height = 'auto'
      textRef.current.style.height = textRef.current.scrollHeight + 'px'
    }
  }, [editing])

  const handleSave = () => {
    if (editText.trim()) updateBlock(spaceId, block.id, { text: editText.trim() })
    setEditing(false)
  }

  const handleAddSubTask = () => {
    if (subTaskText.trim()) {
      addSubTask(spaceId, block.id, subTaskText.trim())
      setSubTaskText('')
      setShowSubTaskInput(false)
    }
  }

  const pendingSubs = (block.subTasks || []).filter(s => !s.done).length
  const doneSubs = (block.subTasks || []).filter(s => s.done).length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        'group relative rounded-xl border bg-card transition-all duration-200',
        block.isPinned ? 'border-primary/30' : 'border-border hover:border-border/80',
        compact ? 'p-3' : 'p-4',
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => toggleCollapse(spaceId, block.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <span className={cn('text-xs font-medium flex items-center gap-1', cfg.color)}>
            <span>{cfg.emoji}</span>
            <span>{cfg.label}</span>
          </span>
          {block.category && (
            <Badge variant="outline" className="text-[10px] py-0 h-4">{block.category}</Badge>
          )}
          {block.isPinned && <Pin className="h-3 w-3 text-primary" />}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon-sm" onClick={() => togglePin(spaceId, block.id)}>
            <Pin className={cn('h-3 w-3', block.isPinned ? 'text-primary' : 'text-muted-foreground')} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setShowMenu(s => !s)}>
            <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteBlock(spaceId, block.id)}>
            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>

      {/* Type change menu */}
      {showMenu && (
        <div className="absolute right-2 top-10 z-20 bg-popover border border-border rounded-lg p-2 shadow-lg grid grid-cols-2 gap-1 w-56" onMouseLeave={() => setShowMenu(false)}>
          {(Object.entries(BLOCK_TYPE_CONFIG) as [any, any][]).map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => { updateBlock(spaceId, block.id, { type }); setShowMenu(false) }}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded text-xs hover:bg-secondary transition-colors text-left',
                block.type === type ? 'bg-secondary text-foreground' : 'text-muted-foreground'
              )}
            >
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {!isCollapsed && (
        <>
          {editing ? (
            <div className="space-y-2">
              <textarea
                ref={textRef}
                value={editText}
                onChange={e => { setEditText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave(); if (e.key === 'Escape') setEditing(false) }}
                className="w-full bg-transparent text-sm text-foreground outline-none resize-none font-sans leading-relaxed"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div
              className="text-sm text-foreground leading-relaxed cursor-pointer prose prose-sm dark:prose-invert max-w-none prose-p:my-1"
              onDoubleClick={() => { setEditing(true); setEditText(block.text) }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text}</ReactMarkdown>
            </div>
          )}

          {/* Annotation */}
          {block.annotation && (
            <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">{block.annotation}</p>
          )}

          {/* Sub-tasks */}
          {(block.subTasks && block.subTasks.length > 0) && (
            <div className="mt-3 space-y-1">
              {pendingSubs > 0 || doneSubs > 0 ? (
                <div className="text-[10px] text-muted-foreground mb-1">{doneSubs}/{(block.subTasks?.length || 0)} done</div>
              ) : null}
              {block.subTasks.map(st => (
                <div key={st.id} className="flex items-center gap-2 group/sub">
                  <Checkbox
                    checked={st.done}
                    onCheckedChange={() => toggleSubTask(spaceId, block.id, st.id)}
                    className="h-3 w-3"
                  />
                  <span className={cn('text-xs flex-1', st.done ? 'line-through text-muted-foreground' : 'text-foreground')}>{st.text}</span>
                  <button onClick={() => deleteSubTask(spaceId, block.id, st.id)} className="opacity-0 group-hover/sub:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Sub-task input */}
          {showSubTaskInput && (
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 text-xs bg-secondary rounded px-2 py-1 outline-none"
                placeholder="Add sub-task…"
                value={subTaskText}
                onChange={e => setSubTaskText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddSubTask(); if (e.key === 'Escape') setShowSubTaskInput(false) }}
                autoFocus
              />
              <Button size="sm" onClick={handleAddSubTask}><Check className="h-3 w-3" /></Button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{formatDate(block.createdAt)}</span>
            <button
              onClick={() => setShowSubTaskInput(s => !s)}
              className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground hover:text-primary transition-all flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />sub-task
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}
