import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useNotesStore, NoteFile } from '@/store/notesStore'
import { useBlocksStore } from '@/store/blocksStore'
import { Button } from '@/components/ui'
import { BLOCK_TYPE_CONFIG } from '@/store/blocksStore'

interface GraphNode {
  id: string
  name: string
  type: 'note' | 'block' | 'tag'
  val: number
  color: string
}
interface GraphLink {
  source: string
  target: string
}

export default function GraphView({ onClose }: { onClose?: () => void }) {
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ForceGraph, setForceGraph] = useState<any>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [dims, setDims] = useState({ width: 800, height: 600 })

  const { files, backlinks, loadFile } = useNotesStore()
  const { spaces } = useBlocksStore()

  // Dynamically import force graph (heavy lib)
  useEffect(() => {
    import('react-force-graph-2d').then(m => setForceGraph(() => m.default))
  }, [])

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDims({ width, height })
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []
    const nodeIds = new Set<string>()

    const addNode = (node: GraphNode) => {
      if (!nodeIds.has(node.id)) { nodes.push(node); nodeIds.add(node.id) }
    }

    // Walk notes
    const allNotes: NoteFile[] = []
    const walk = (ns: NoteFile[]) => { for (const n of ns) { if (!n.isFolder) allNotes.push(n); if (n.children) walk(n.children) } }
    walk(files)

    for (const note of allNotes) {
      addNode({ id: note.path, name: note.name.replace('.md', ''), type: 'note', val: 4, color: '#3b82f6' })
      // Tags
      const tags = note.content?.match(/(?:^|\s)#([a-zA-Z0-9_-]+)/g) || []
      for (const tagRaw of tags) {
        const tag = tagRaw.trim().slice(1)
        const tagId = `tag:${tag}`
        addNode({ id: tagId, name: `#${tag}`, type: 'tag', val: 2, color: '#f59e0b' })
        links.push({ source: note.path, target: tagId })
      }
    }
    // Backlinks
    for (const [target, sources] of Object.entries(backlinks)) {
      for (const src of sources) {
        if (nodeIds.has(src) && nodeIds.has(target)) links.push({ source: src, target })
      }
    }

    // Blocks
    for (const space of spaces) {
      const spaceId = `space:${space.id}`
      addNode({ id: spaceId, name: `${space.icon} ${space.name}`, type: 'block', val: 3, color: '#8b5cf6' })
      for (const block of space.blocks.slice(0, 30)) {
        const bId = `block:${block.id}`
        addNode({
          id: bId,
          name: block.text.slice(0, 40) + (block.text.length > 40 ? '…' : ''),
          type: 'block',
          val: 2,
          color: block.type === 'idea' ? '#fbbf24' : block.type === 'goal' ? '#10b981' : block.type === 'win' ? '#84cc16' : '#a78bfa'
        })
        links.push({ source: spaceId, target: bId })
      }
    }

    return { nodes, links }
  }, [files, backlinks, spaces])

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node)
    if (node.type === 'note') loadFile(node.id)
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 600)
      graphRef.current.zoom(3, 600)
    }
  }, [loadFile])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-background overflow-hidden">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <Button size="icon-sm" variant="secondary" onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.3, 300)}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="secondary" onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 0.7, 300)}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="secondary" onClick={() => graphRef.current?.zoomToFit(400, 40)}>
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        {onClose && <Button size="icon-sm" variant="secondary" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 flex gap-3 bg-card/80 backdrop-blur px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />Notes</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" />Tags</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500 inline-block" />Thoughts</span>
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="absolute bottom-3 right-3 z-20 bg-card/90 backdrop-blur border border-border rounded-xl p-3 max-w-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">{selectedNode.name}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{selectedNode.type}</p>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {graphData.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <p className="text-muted-foreground text-sm">No nodes yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add notes or thoughts to see your knowledge graph.</p>
          </div>
        </div>
      )}

      {/* Graph */}
      {ForceGraph && graphData.nodes.length > 0 && (
        <ForceGraph
          ref={graphRef}
          width={dims.width}
          height={dims.height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor={(n: GraphNode) => n.color}
          nodeVal={(n: GraphNode) => n.val}
          linkColor={() => 'rgba(255,255,255,0.08)'}
          linkWidth={1}
          backgroundColor="transparent"
          onNodeClick={handleNodeClick}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name as string
            const fontSize = 10 / globalScale
            const r = Math.sqrt(node.val) * 2.5
            ctx.beginPath()
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
            ctx.fillStyle = node.color
            ctx.fill()
            if (globalScale >= 1.5 || node === selectedNode) {
              ctx.font = `${fontSize}px Sora, sans-serif`
              ctx.fillStyle = 'rgba(255,255,255,0.8)'
              ctx.textAlign = 'center'
              ctx.fillText(label.slice(0, 20), node.x, node.y + r + fontSize)
            }
          }}
          cooldownTicks={80}
          onEngineStop={() => graphRef.current?.zoomToFit(400, 40)}
        />
      )}
    </div>
  )
}
