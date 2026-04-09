import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Layers, LayoutGrid, Share2, Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { useBlocksStore, BLOCK_TYPE_CONFIG, Block, BlockType, Space } from '@/store/blocksStore'
import BlockCard from '@/components/blocks/BlockCard'
import BlockInput from '@/components/blocks/BlockInput'
import { Button, Badge, Input } from '@/components/ui'
import { cn } from '@/lib/utils'

// ─── Space Sidebar ────────────────────────────────────────────────────────────
function SpaceSidebar() {
  const { spaces, activeSpaceId, setActiveSpace, createSpace, renameSpace, deleteSpace } = useBlocksStore()
  const [newSpaceName, setNewSpaceName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')

  return (
    <div className="w-52 shrink-0 border-r border-border flex flex-col bg-panel/50">
      <div className="p-3 border-b border-border">
        <p className="text-xs font-heading font-semibold text-foreground">Spaces</p>
      </div>
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {spaces.map(sp => (
          <div key={sp.id} className="group relative">
            {renamingId === sp.id ? (
              <input
                autoFocus
                className="w-full text-xs px-2 py-1.5 rounded bg-secondary outline-none"
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { renameSpace(sp.id, renameVal); setRenamingId(null) }
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                onBlur={() => setRenamingId(null)}
              />
            ) : (
              <button
                onClick={() => setActiveSpace(sp.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left',
                  activeSpaceId === sp.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <span className="text-sm">{sp.icon}</span>
                <span className="flex-1 truncate">{sp.name}</span>
                <span className="text-[10px] opacity-60">{sp.blocks.length}</span>
              </button>
            )}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
              <button onClick={() => { setRenamingId(sp.id); setRenameVal(sp.name) }} className="p-0.5 text-muted-foreground hover:text-foreground"><Pencil className="h-2.5 w-2.5" /></button>
              {spaces.length > 1 && (
                <button onClick={() => deleteSpace(sp.id)} className="p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-2.5 w-2.5" /></button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-border">
        <div className="flex gap-1.5">
          <input
            className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-secondary outline-none placeholder:text-muted-foreground"
            placeholder="New space…"
            value={newSpaceName}
            onChange={e => setNewSpaceName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newSpaceName.trim()) {
                const id = createSpace(newSpaceName.trim())
                setActiveSpace(id)
                setNewSpaceName('')
              }
            }}
          />
          <Button size="icon-sm" variant="ghost" onClick={() => {
            if (newSpaceName.trim()) { const id = createSpace(newSpaceName.trim()); setActiveSpace(id); setNewSpaceName('') }
          }}><Plus className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban View ──────────────────────────────────────────────────────────────
function KanbanView({ blocks, spaceId, collapsedIds }: { blocks: Block[]; spaceId: string; collapsedIds: string[] }) {
  const grouped = useMemo(() => {
    const cols: Record<string, Block[]> = {}
    for (const b of blocks) {
      const key = b.category || b.type
      if (!cols[key]) cols[key] = []
      cols[key].push(b)
    }
    return Object.entries(cols).sort(([a], [b]) => a.localeCompare(b))
  }, [blocks])

  if (grouped.length === 0) return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No blocks yet. Capture your first thought.</p>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-4 h-full p-4 min-w-max items-start">
        {grouped.map(([group, gBlocks]) => (
          <div key={group} className="w-72 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm font-heading font-semibold text-foreground capitalize">{group}</span>
              <Badge variant="secondary" className="text-[10px]">{gBlocks.length}</Badge>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
              <AnimatePresence>
                {gBlocks.map(b => (
                  <BlockCard key={b.id} block={b} spaceId={spaceId} isCollapsed={collapsedIds.includes(b.id)} compact />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tiling (masonry) View ────────────────────────────────────────────────────
function TilingView({ blocks, spaceId, collapsedIds }: { blocks: Block[]; spaceId: string; collapsedIds: string[] }) {
  const pinned = blocks.filter(b => b.isPinned)
  const rest = blocks.filter(b => !b.isPinned).sort((a, b) => b.createdAt - a.createdAt)
  const sorted = [...pinned, ...rest]

  if (sorted.length === 0) return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Brain className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-heading font-semibold mb-1">Your thought space is empty</p>
        <p className="text-xs">Start typing below to capture your first thought</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-left max-w-xs">
          {['/idea A lightbulb moment', '/reflect How I feel about…', '/learn Studied React today', '/goal I want to achieve…'].map(ex => (
            <div key={ex} className="text-[10px] text-muted-foreground bg-secondary rounded px-2 py-1 font-mono">{ex}</div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="columns-1 md:columns-2 xl:columns-3 gap-3 space-y-3">
        <AnimatePresence>
          {sorted.map(b => (
            <div key={b.id} className="break-inside-avoid mb-3">
              <BlockCard block={b} spaceId={spaceId} isCollapsed={collapsedIds.includes(b.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Type Filter Bar ──────────────────────────────────────────────────────────
function TypeFilter({ selected, onChange, blocks }: { selected: BlockType | null; onChange: (t: BlockType | null) => void; blocks: Block[] }) {
  const counts = useMemo(() => {
    const c: Partial<Record<BlockType, number>> = {}
    for (const b of blocks) c[b.type] = (c[b.type] || 0) + 1
    return c
  }, [blocks])

  const usedTypes = Object.keys(counts) as BlockType[]

  return (
    <div className="flex gap-1.5 overflow-x-auto py-1 px-1 shrink-0">
      <button
        onClick={() => onChange(null)}
        className={cn('px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors', !selected ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary')}
      >All ({blocks.length})</button>
      {usedTypes.map(t => {
        const cfg = BLOCK_TYPE_CONFIG[t]
        return (
          <button
            key={t}
            onClick={() => onChange(selected === t ? null : t)}
            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors', selected === t ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary')}
          >
            {cfg.emoji} {cfg.label} ({counts[t]})
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Blocks View ─────────────────────────────────────────────────────────
export default function BlocksView() {
  const { spaces, activeSpaceId, getActiveSpace } = useBlocksStore()
  const [viewMode, setViewMode] = useState<'tiling' | 'kanban'>('tiling')
  const [typeFilter, setTypeFilter] = useState<BlockType | null>(null)

  const space = getActiveSpace()
  const blocks = space?.blocks || []
  const collapsedIds = space?.collapsedIds || []

  const filtered = typeFilter ? blocks.filter(b => b.type === typeFilter) : blocks

  return (
    <div className="flex h-full overflow-hidden">
      <SpaceSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-3 shrink-0">
          <span className="text-sm font-heading font-semibold text-foreground flex-1">
            {space?.icon} {space?.name}
            <span className="ml-2 text-xs text-muted-foreground font-normal font-sans">{blocks.length} thoughts</span>
          </span>
          <div className="flex gap-1">
            <Button
              size="icon-sm" variant={viewMode === 'tiling' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('tiling')} title="Tiling view"
            ><Layers className="h-3.5 w-3.5" /></Button>
            <Button
              size="icon-sm" variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('kanban')} title="Kanban view"
            ><LayoutGrid className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        {/* Type filter */}
        <div className="px-3 py-1.5 border-b border-border shrink-0">
          <TypeFilter selected={typeFilter} onChange={setTypeFilter} blocks={blocks} />
        </div>

        {/* Content */}
        {viewMode === 'tiling'
          ? <TilingView blocks={filtered} spaceId={activeSpaceId} collapsedIds={collapsedIds} />
          : <KanbanView blocks={filtered} spaceId={activeSpaceId} collapsedIds={collapsedIds} />
        }

        {/* Input */}
        <BlockInput />
      </div>
    </div>
  )
}
