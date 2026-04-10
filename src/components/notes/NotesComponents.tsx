import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronRight, ChevronDown, FileText, Folder, Trash2,
  Search, RefreshCw, Save, Settings, Plus, GitBranch, FolderOpen, Map
} from 'lucide-react'
import { useNotesStore, NoteFile } from '@/store/notesStore'
import { Button, Input, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import NewNoteModal from './NewNoteModal'

// ─── File Tree Node ──────────────────────────────────────────────────────────
function FileNode({ node, depth = 0 }: { node: NoteFile; depth?: number }) {
  const { currentFile, loadFile, deleteFile } = useNotesStore()
  const [open, setOpen] = useState(depth < 1)
  const isActive = currentFile?.path === node.path

  if (node.isFolder) {
    const label = node.name
    return (
      <div>
        <button
          onClick={() => setOpen(s => !s)}
          className="flex items-center gap-1.5 w-full py-1 rounded text-xs hover:bg-secondary transition-colors text-muted-foreground"
          style={{ paddingLeft: `${depth * 10 + 6}px` }}
        >
          {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          <FolderOpen className="h-3 w-3 shrink-0 text-primary/60" />
          <span className="truncate text-[11px] font-medium">{label}</span>
        </button>
        {open && node.children?.map(child => <FileNode key={child.path} node={child} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <div className="group relative" style={{ paddingLeft: `${depth * 10}px` }}>
      <button
        onClick={() => loadFile(node.path)}
        className={cn(
          'flex items-center gap-1.5 w-full py-1 pl-2 rounded text-xs transition-colors',
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
  const { files, currentFile, searchQuery, setSearchQuery, fetchFiles, isLoading, config, getAllNotes } = useNotesStore()
  const [showNewNote, setShowNewNote] = useState(false)

  const allNotes = getAllNotes()
  const filtered = searchQuery
    ? allNotes.filter(n =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null

  return (
    <div className="flex flex-col h-full bg-panel/80 border-r border-border">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-1.5">
        <span className="text-xs font-heading font-semibold text-foreground flex-1">Notes</span>
        <Button variant="ghost" size="icon-sm" onClick={() => fetchFiles()} title="Sync from GitHub">
          <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setShowNewNote(true)} title="New note">
          <Plus className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onShowSettings} title="Settings">
          <Settings className="h-3 w-3" />
        </Button>
      </div>

      {/* GitHub status */}
      {config && (
        <div className="px-3 py-1.5 border-b border-border">
          <p className="text-[9px] font-mono text-muted-foreground/70 truncate">
            📁 {config.username}/{config.repo}/markdownlod
          </p>
        </div>
      )}

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

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-2 px-1 space-y-0.5">
        {!config ? (
          <div className="text-center py-10 px-4 space-y-3">
            <GitBranch className="h-7 w-7 text-muted-foreground mx-auto opacity-60" />
            <div>
              <p className="text-xs font-medium text-foreground">Connect GitHub</p>
              <p className="text-[10px] text-muted-foreground mt-1">Notes save to markdownlod/ folder</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs w-full" onClick={onShowSettings}>Configure →</Button>
          </div>
        ) : filtered ? (
          filtered.length > 0
            ? filtered.map(n => <FileNode key={n.path} node={n} />)
            : <p className="text-xs text-muted-foreground text-center py-4">No results</p>
        ) : (
          files.length > 0
            ? files.map(n => <FileNode key={n.path} node={n} />)
            : (
              <div className="text-center py-8 px-4">
                <p className="text-xs text-muted-foreground">No notes yet</p>
                <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setShowNewNote(true)}>
                  + Create first note
                </Button>
              </div>
            )
        )}
      </div>

      <NewNoteModal open={showNewNote} onClose={() => setShowNewNote(false)} />
    </div>
  )
}

// ─── Editor ──────────────────────────────────────────────────────────────────
export function NotesEditor() {
  const { currentFile, editorContent, setEditorContent, saveFile, isSaving, backlinks } = useNotesStore()
  const [preview, setPreview] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((val: string) => {
    setEditorContent(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveFile(), 1400)
  }, [setEditorContent, saveFile])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  if (!currentFile) return (
    <div className="flex-1 flex items-center justify-center text-center px-8 bg-background">
      <div>
        <div className="text-5xl mb-4">📝</div>
        <p className="text-sm font-heading font-semibold text-foreground mb-1">Select a note to edit</p>
        <p className="text-xs text-muted-foreground">All notes are saved in <code className="font-mono text-primary">markdownlod/</code> on GitHub</p>
      </div>
    </div>
  )

  const fileTags = editorContent.match(/(?:^|\s)#([a-zA-Z0-9_-]+)/g)?.map(m => m.trim().slice(1)) || []
  const links = editorContent.match(/\[\[([^\]]+)\]\]/g)?.map(m => m.slice(2, -2)) || []
  const myBacklinks = backlinks[currentFile.path] || []
  const folder = currentFile.path.split('/').slice(0, -1).join('/')

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-heading font-semibold text-foreground truncate">
            {currentFile.name.replace('.md', '')}
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground/60 truncate">{currentFile.path}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSaving && <span className="text-[10px] text-muted-foreground animate-pulse">Saving…</span>}
          <Button size="sm" variant={preview ? 'secondary' : 'ghost'} onClick={() => setPreview(s => !s)} className="text-xs">
            {preview ? 'Edit' : 'Preview'}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => saveFile()} title="Save now">
            <Save className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor / Preview area */}
        <div className="flex-1 overflow-y-auto">
          {preview ? (
            <div className="px-6 py-4 prose prose-sm dark:prose-invert max-w-none prose-headings:font-heading">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{editorContent}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={editorContent}
              onChange={e => handleChange(e.target.value)}
              className="w-full h-full min-h-full px-6 py-4 bg-transparent text-sm text-foreground font-mono leading-relaxed outline-none resize-none"
              placeholder={`---\ntitle: Your Note Title\ntags: [tag1, tag2]\ntype: note\n---\n\n# Your Note Title\n\nWrite your note here…\n\n## Observations\n- [insight] Key fact #tag\n\n## Relations\n- relates_to [[Other Note]]`}
              spellCheck={false}
            />
          )}
        </div>

        {/* Right info panel */}
        <div className="w-48 border-l border-border p-3 space-y-4 overflow-y-auto shrink-0 hidden xl:flex xl:flex-col bg-panel/40">
          {fileTags.length > 0 && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1">
                {fileTags.map(t => <Badge key={t} variant="outline" className="text-[9px] px-1.5 py-0">#{t}</Badge>)}
              </div>
            </div>
          )}
          {links.length > 0 && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Links to</p>
              <div className="space-y-1">
                {links.map(l => (
                  <div key={l} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <FileText className="h-2.5 w-2.5 text-primary/60 shrink-0" />{l}
                  </div>
                ))}
              </div>
            </div>
          )}
          {myBacklinks.length > 0 && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Backlinks ({myBacklinks.length})</p>
              <div className="space-y-1">
                {myBacklinks.map(l => (
                  <div key={l} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <FileText className="h-2.5 w-2.5 text-primary/60 shrink-0" />
                    {l.split('/').pop()?.replace('.md', '')}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-auto">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Path</p>
            <p className="text-[9px] font-mono text-muted-foreground/60 break-all">{currentFile.path}</p>
          </div>
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
  const [rootFolder, setRootFolder] = useState(config?.rootFolder || 'markdownlod')
  const [key, setKey] = useState(openRouterKey)
  const [saved, setSaved] = useState(false)

  const save = () => {
    if (pat && username && repo) setConfig({ pat, username, repo, rootFolder: rootFolder || 'markdownlod' })
    setOpenRouterKey(key)
    setSaved(true)
    setTimeout(() => { setSaved(false); onOpenChange(false) }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><GitBranch className="h-4 w-4" />Notes — GitHub Settings</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">GitHub Repository</p>
            <div className="space-y-2">
              <Input placeholder="Personal Access Token (repo scope)" value={pat} onChange={e => setPat(e.target.value)} type="password" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                <Input placeholder="Repo name" value={repo} onChange={e => setRepo(e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Root folder <span className="text-muted-foreground/60 font-normal">(notes saved here)</span>
            </p>
            <Input placeholder="markdownlod" value={rootFolder} onChange={e => setRootFolder(e.target.value)} className="font-mono text-xs" />
            <p className="text-[10px] text-muted-foreground mt-1">All notes will be saved in <code className="font-mono">{username || 'username'}/{repo || 'repo'}/{rootFolder || 'markdownlod'}/</code></p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">OpenRouter API Key</p>
            <Input placeholder="sk-or-…" value={key} onChange={e => setKey(e.target.value)} type="password" />
          </div>
          <Button className="w-full" onClick={save}>{saved ? '✓ Saved!' : 'Save Settings'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
