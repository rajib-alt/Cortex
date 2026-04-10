import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, ChevronRight, X, Sparkles, Save, Loader2, FolderOpen } from 'lucide-react'
import { NOTE_TEMPLATES, NoteTemplate, getTemplateById } from './templates/noteTemplates'
import { useNotesStore } from '@/store/notesStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Badge, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

interface NewNoteModalProps {
  open: boolean
  onClose: () => void
  defaultTemplateId?: string
}

// Group templates by category
const TEMPLATE_GROUPS = [
  { label: '📓 Journal & Review', ids: ['daily-journal', 'weekly-review'] },
  { label: '📚 Books', ids: ['book-fiction', 'book-nonfiction'] },
  { label: '🎓 Learning', ids: ['course', 'skill-ai-marketing'] },
  { label: '💼 Work', ids: ['project', 'meeting'] },
  { label: '💡 Knowledge', ids: ['idea', 'finance-note', 'person'] },
]

export default function NewNoteModal({ open, onClose, defaultTemplateId }: NewNoteModalProps) {
  const { createNote, config } = useNotesStore()
  const [step, setStep] = useState<'template' | 'fill'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null)
  const [title, setTitle] = useState('')
  const [folder, setFolder] = useState('')
  const [tags, setTags] = useState('')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setStep(defaultTemplateId ? 'fill' : 'template')
      const tpl = defaultTemplateId ? getTemplateById(defaultTemplateId) : null
      if (tpl) {
        setSelectedTemplate(tpl)
        setFolder(tpl.folder)
        setTags(tpl.tags.join(', '))
        setContent(tpl.generate())
      }
    } else {
      // reset
      setStep('template')
      setSelectedTemplate(null)
      setTitle('')
      setFolder('')
      setTags('')
      setContent('')
      setError('')
    }
  }, [open, defaultTemplateId])

  const selectTemplate = (tpl: NoteTemplate) => {
    setSelectedTemplate(tpl)
    setFolder(tpl.folder)
    setTags(tpl.tags.join(', '))
    setContent(tpl.generate())
    // Set default title from template
    const today = new Date().toISOString().split('T')[0]
    if (tpl.id === 'daily-journal') setTitle(`Journal — ${today}`)
    else if (tpl.id === 'weekly-review') setTitle(`Weekly Review — Week of ${today}`)
    else setTitle('')
    setStep('fill')
  }

  const handleBlankNote = () => {
    setSelectedTemplate(null)
    setFolder('')
    setTags('')
    setContent('# New Note\n\nStart writing…\n\n## Observations\n- \n\n## Relations\n- ')
    setTitle('')
    setStep('fill')
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('Please enter a title'); return }
    if (!config) { setError('Connect GitHub first in Settings'); return }
    setIsSaving(true)
    setError('')
    try {
      // Inject the title as the # heading if content doesn't already start with it
      let body = content
      if (!body.startsWith(`# ${title}`)) {
        body = body.replace(/^# .*$/m, `# ${title}`)
        if (!body.includes(`# ${title}`)) body = `# ${title}\n\n${body}`
      }
      await createNote({
        title: title.trim(),
        folder: folder.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        content: body,
      })
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to save note')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-2xl transition-all', step === 'fill' ? 'max-w-3xl' : '')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'fill' && selectedTemplate && (
              <button onClick={() => setStep('template')} className="text-muted-foreground hover:text-foreground mr-1">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            )}
            <FileText className="h-4 w-4 text-primary" />
            {step === 'template' ? 'New Note — Choose Template' : `${selectedTemplate?.emoji || '📝'} ${selectedTemplate?.name || 'New Note'}`}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* ─── Step 1: Template picker ─── */}
          {step === 'template' && (
            <motion.div key="template" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
              {/* Blank note shortcut */}
              <button
                onClick={handleBlankNote}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
              >
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">✏️</div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">Blank Note</p>
                  <p className="text-xs text-muted-foreground">Start from scratch with Basic Memory structure</p>
                </div>
              </button>

              {/* Template groups */}
              {TEMPLATE_GROUPS.map(group => {
                const tpls = group.ids.map(id => NOTE_TEMPLATES.find(t => t.id === id)).filter(Boolean) as NoteTemplate[]
                return (
                  <div key={group.label}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {tpls.map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => selectTemplate(tpl)}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                        >
                          <span className="text-2xl shrink-0 mt-0.5">{tpl.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{tpl.name}</p>
                            <p className="text-[10px] text-muted-foreground leading-snug">{tpl.description}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <FolderOpen className="h-2.5 w-2.5 text-muted-foreground/60" />
                              <span className="text-[9px] text-muted-foreground/60 font-mono">markdownlod/{tpl.folder}/</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* ─── Step 2: Fill in ─── */}
          {step === 'fill' && (
            <motion.div key="fill" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              {/* Title */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Title *</label>
                <Input
                  placeholder="Note title…"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="text-base font-medium"
                  autoFocus
                />
              </div>

              {/* Folder + Tags row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
                    Folder <span className="text-muted-foreground/60 normal-case">(inside markdownlod/)</span>
                  </label>
                  <Input
                    placeholder="e.g. books/fiction"
                    value={folder}
                    onChange={e => setFolder(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Tags</label>
                  <Input
                    placeholder="book, fiction, reading"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Destination preview */}
              {title && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 text-[10px] font-mono text-muted-foreground">
                  <FolderOpen className="h-3 w-3 shrink-0" />
                  markdownlod/{folder ? folder + '/' : ''}{title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40)}.md
                </div>
              )}

              {/* Content editor */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Content (Markdown)</label>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="min-h-[280px] font-mono text-xs leading-relaxed"
                  placeholder="Write your note…"
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-3 pt-1">
                <Button className="flex-1 gap-2" onClick={handleSave} disabled={isSaving || !title.trim()}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {isSaving ? 'Saving to GitHub…' : 'Save to GitHub'}
                </Button>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
              </div>

              {!config && (
                <p className="text-xs text-amber-400 text-center">⚠️ Connect GitHub in Settings to save notes</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
