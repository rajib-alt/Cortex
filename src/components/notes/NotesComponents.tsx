import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronRight, ChevronDown, FileText, Folder, Plus, Trash2,
  Search, RefreshCw, Save, Settings, FolderPlus, GitBranch
} from 'lucide-react'
import { useNotesStore, NoteFile } from '@/store/notesStore'
import { Button, Input, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ─── File Tree Node ──────────────────────────────────────────────────────────
function FileNode({ node, depth = 0 }: { node: NoteFile; depth?: number }) {
  const { currentFile, loadFile, deleteFile } = useNotesStore()
  const [open, setOpen] = useState(depth < 1)
  const isActive = currentFile?.path === node.path

  if (node.isFolder) return (
    <div>
      <button
        onClick={() => setOpen(s => !s)}
        className={cn('flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs hover:bg-secondary transition-colors text-muted-foreground')}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <Folder className="h-3 w-3 shrink-0 text-primary/70" />
        <span className="truncate">{node.name}</span>
      </button>
      {open && node.children?.map(child => <FileNode key={child.path} node={child} depth={depth + 1} />)}
    </div>
  )

  return (
    <div className="group relative" style={{ paddingLeft: `${depth * 12}px` }}>
      <button
        onClick={() => loadFile(node.path)}
        className={cn(
          'flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs transition-colors',
          isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        )}
      >
        <FileText className="h-3 w-3 shrink-0" />
        <span className="truncate flex-1 text-left">{node.name.replace('.md', '')}</span>
      </button>
      <button
        onClick={() => deleteFile(node.path)}
        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export function NotesSidebar({ onShowSettings }: { onShowSettings: () => void }) {
  const { files, currentFile, searchQuery, setSearchQuery, fetchFiles, isLoading, createNote, config, getAllNotes } = useNotesStore()
  const [showNewNote, setShowNewNote] = useState(false)
  const [newNoteName, setNewNoteName] = useState('')

  const handleCreate = async () => {
    if (!newNoteName.trim()) return
    await createNote(newNoteName.trim())
    setNewNoteName('')
    setShowNewNote(false)
  }

  const allNotes = getAllNotes()
  const filtered = searchQuery
    ? allNotes.filter(n =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null

  return (
    <div className="flex flex-col h-full bg-panel border-r border-border">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        <span className="text-xs font-semibold text-foreground flex-1 font-heading">Notes</span>
        <Button variant="ghost" size="icon-sm" onClick={() => fetchFiles()} title="Sync"><RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setShowNewNote(s => !s)} title="New note"><Plus className="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={onShowSettings} title="Settings"><Settings className="h-3 w-3" /></Button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            className="h-7 pl-6 text-xs"
            placeholder="Search notes…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* New note input */}
      {showNewNote && (
        <div className="p-2 border-b border-border flex gap-2">
          <Input
            className="h-7 text-xs flex-1"
            placeholder="Note name…"
            value={newNoteName}
            onChange={e => setNewNoteName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewNote(false) }}
            autoFocus
          />
          <Button size="sm" onClick={handleCreate}>Create</Button>
        </div>
      )}

      {/* File tree or search results */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1">
        {!config ? (
          <div className="text-center py-8 px-4">
            <GitBranch className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Connect GitHub to sync notes</p>
            <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={onShowSettings}>Configure</Button>
          </div>
        ) : filtered ? (
          filtered.map(n => <FileNode key={n.path} node={n} />)
        ) : (
          files.map(n => <FileNode key={n.path} node={n} />)
        )}
      </div>
    </div>
  )
}

// ─── Editor ──────────────────────────────────────────────────────────────────
export function NotesEditor() {
  const { currentFile, editorContent, setEditorContent, saveFile, isSaving, tags, backlinks } = useNotesStore()
  const [preview, setPreview] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((val: string) => {
    setEditorContent(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveFile(), 1200)
  }, [setEditorContent, saveFile])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  if (!currentFile) return (
    <div className="flex-1 flex items-center justify-center text-center px-8">
      <div>
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Select a note to start editing</p>
        <p className="text-xs text-muted-foreground mt-1">Or create a new one from the sidebar</p>
      </div>
    </div>
  )

  const fileTags = editorContent.match(/(?:^|\s)#([a-zA-Z0-9_-]+)/g)?.map(m => m.trim().slice(1)) || []
  const links = editorContent.match(/\[\[([^\]]+)\]\]/g)?.map(m => m.slice(2, -2)) || []
  const myBacklinks = backlinks[currentFile.path] || []

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-3">
        <h2 className="flex-1 text-sm font-heading font-semibold text-foreground truncate">
          {currentFile.name.replace('.md', '')}
        </h2>
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-[10px] text-muted-foreground animate-pulse">Saving…</span>}
          <Button size="sm" variant="ghost" onClick={() => setPreview(s => !s)}>
            {preview ? 'Edit' : 'Preview'}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => saveFile()} title="Save">
            <Save className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor / Preview */}
        <div className="flex-1 overflow-y-auto">
          {preview ? (
            <div className="px-6 py-4 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{editorContent}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={editorContent}
              onChange={e => handleChange(e.target.value)}
              className="w-full h-full min-h-full px-6 py-4 bg-transparent text-sm text-foreground font-mono leading-relaxed outline-none resize-none"
              placeholder="Write your note in Markdown…&#10;&#10;Use [[note name]] for backlinks&#10;Use #tag for tags"
              spellCheck={false}
            />
          )}
        </div>

        {/* Right panel: tags, links, backlinks */}
        <div className="w-52 border-l border-border p-3 space-y-4 overflow-y-auto shrink-0 hidden xl:block">
          {fileTags.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {fileTags.map(t => <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>)}
              </div>
            </div>
          )}
          {links.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Links to</p>
              <div className="space-y-1">
                {links.map(l => (
                  <div key={l} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3 text-primary/60" />{l}
                  </div>
                ))}
              </div>
            </div>
          )}
          {myBacklinks.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Backlinks</p>
              <div className="space-y-1">
                {myBacklinks.map(l => (
                  <div key={l} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3 text-primary/60" />{l.split('/').pop()?.replace('.md', '')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
export function NotesSettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { config, setConfig, openRouterKey, setOpenRouterKey } = useNotesStore()
  const [pat, setPat] = useState(config?.pat || '')
  const [username, setUsername] = useState(config?.username || '')
  const [repo, setRepo] = useState(config?.repo || '')
  const [key, setKey] = useState(openRouterKey)

  const save = () => {
    if (pat && username && repo) setConfig({ pat, username, repo })
    setOpenRouterKey(key)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Notes Settings</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">GitHub — where your notes are stored</p>
            <div className="space-y-2">
              <Input placeholder="GitHub PAT (personal access token)" value={pat} onChange={e => setPat(e.target.value)} type="password" />
              <Input placeholder="GitHub username" value={username} onChange={e => setUsername(e.target.value)} />
              <Input placeholder="Repo name (e.g. my-notes)" value={repo} onChange={e => setRepo(e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">OpenRouter API key (for AI features)</p>
            <Input placeholder="sk-or-…" value={key} onChange={e => setKey(e.target.value)} type="password" />
          </div>
          <Button className="w-full" onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
