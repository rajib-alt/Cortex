import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, AlertCircle, Calendar, Tag, ChevronDown } from 'lucide-react'
import { useTasksStore, Task, TaskStatus, ParaCategory, STATUS_CONFIG, PARA_CONFIG } from '@/store/tasksStore'
import {
  Button, Input, Textarea, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Dialog, DialogContent, DialogHeader, DialogTitle, Checkbox, Card, CardHeader, CardTitle, CardContent
} from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

// ─── Task Modal ───────────────────────────────────────────────────────────────
function TaskModal({ open, onClose, editTask, defaultCategory }: {
  open: boolean; onClose: () => void; editTask?: Task | null; defaultCategory?: ParaCategory
}) {
  const { addTask, updateTask } = useTasksStore()
  const [form, setForm] = useState<Partial<Task>>(() => editTask || {
    title: '', description: '', status: 'backlog', category: defaultCategory || 'projects',
    priority: 'medium', tags: [], subTasks: []
  })

  const submit = () => {
    if (!form.title?.trim()) return
    if (editTask) updateTask(editTask.id, form)
    else addTask(form as any)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editTask ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Task title…" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          <Textarea placeholder="Description (optional)" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="min-h-[80px]" />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as ParaCategory }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PARA_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as TaskStatus }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Priority</label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="high">🔴 High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Due date</label>
            <Input type="date" value={form.dueDate || ''} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="h-8 text-xs" />
          </div>
          <Button className="w-full" onClick={submit}>{editTask ? 'Update' : 'Create Task'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const { deleteTask, setStatus, toggleSubTask } = useTasksStore()
  const statusCfg = STATUS_CONFIG[task.status]
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
  const doneSubs = task.subTasks.filter(s => s.done).length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn('p-3 rounded-xl border bg-card group transition-colors', isOverdue ? 'border-red-500/30' : 'border-border hover:border-border/80')}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={task.status === 'done'}
          onCheckedChange={() => setStatus(task.id, task.status === 'done' ? 'active' : 'done')}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p
            className={cn('text-sm font-medium cursor-pointer', task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground')}
            onDoubleClick={onEdit}
          >{task.title}</p>
          {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}

          {task.subTasks.length > 0 && (
            <div className="mt-2 space-y-1">
              {task.subTasks.map(st => (
                <div key={st.id} className="flex items-center gap-1.5">
                  <Checkbox checked={st.done} onCheckedChange={() => toggleSubTask(task.id, st.id)} className="h-3 w-3" />
                  <span className={cn('text-xs', st.done ? 'line-through text-muted-foreground' : 'text-muted-foreground')}>{st.text}</span>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">{doneSubs}/{task.subTasks.length} done</p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={cn('text-[10px] h-4', statusCfg.color)}>{statusCfg.label}</Badge>
            {task.priority === 'high' && <Badge variant="destructive" className="text-[10px] h-4">High</Badge>}
            {task.dueDate && (
              <span className={cn('text-[10px] flex items-center gap-0.5', isOverdue ? 'text-red-400' : 'text-muted-foreground')}>
                <Calendar className="h-2.5 w-2.5" />{formatDate(task.dueDate)}
                {isOverdue && <AlertCircle className="h-2.5 w-2.5" />}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={onEdit}>✏️</Button>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteTask(task.id)}>
            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── PARA Column ──────────────────────────────────────────────────────────────
function ParaColumn({ category, tasks, onAdd, onEdit }: {
  category: ParaCategory; tasks: Task[]; onAdd: () => void; onEdit: (t: Task) => void
}) {
  const cfg = PARA_CONFIG[category]
  const active = tasks.filter(t => t.status !== 'done').length
  const done = tasks.filter(t => t.status === 'done').length
  const [showDone, setShowDone] = useState(false)

  const pendingTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks = tasks.filter(t => t.status === 'done')

  return (
    <div className="min-w-[280px] w-[280px] flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-base">{cfg.emoji}</span>
        <span className="text-sm font-heading font-semibold text-foreground">{cfg.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">{active} active</span>
        <Button size="icon-sm" variant="ghost" onClick={onAdd}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      <p className="text-[10px] text-muted-foreground px-1">{cfg.description}</p>
      <div className="space-y-2">
        <AnimatePresence>
          {pendingTasks.map(t => <TaskCard key={t.id} task={t} onEdit={() => onEdit(t)} />)}
        </AnimatePresence>
        {doneTasks.length > 0 && (
          <div>
            <button onClick={() => setShowDone(s => !s)} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground w-full py-1">
              <ChevronDown className={cn('h-3 w-3 transition-transform', showDone ? '' : '-rotate-90')} />
              {done} completed
            </button>
            {showDone && (
              <div className="space-y-2 opacity-60">
                {doneTasks.map(t => <TaskCard key={t.id} task={t} onEdit={() => onEdit(t)} />)}
              </div>
            )}
          </div>
        )}
        {pendingTasks.length === 0 && doneTasks.length === 0 && (
          <div className="py-6 text-center border border-dashed border-border rounded-xl">
            <p className="text-xs text-muted-foreground">Empty</p>
            <Button size="sm" variant="ghost" className="mt-1 text-xs" onClick={onAdd}>+ Add task</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Tasks View ──────────────────────────────────────────────────────────
export default function TasksView() {
  const { tasks, getByCategory, getOverdue } = useTasksStore()
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [defaultCat, setDefaultCat] = useState<ParaCategory>('projects')
  const overdue = getOverdue()

  const openAdd = (cat: ParaCategory) => { setEditTask(null); setDefaultCat(cat); setShowModal(true) }
  const openEdit = (task: Task) => { setEditTask(task); setDefaultCat(task.category); setShowModal(true) }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <span className="font-heading font-semibold text-sm flex-1">Tasks · PARA</span>
        {overdue.length > 0 && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertCircle className="h-3 w-3" />{overdue.length} overdue
          </Badge>
        )}
        <Button size="sm" onClick={() => openAdd('projects')} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />New
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex gap-6 p-4 min-w-max">
          {(['projects', 'areas', 'resources', 'archive'] as ParaCategory[]).map(cat => (
            <ParaColumn
              key={cat}
              category={cat}
              tasks={getByCategory(cat)}
              onAdd={() => openAdd(cat)}
              onEdit={openEdit}
            />
          ))}
        </div>
      </div>

      <TaskModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditTask(null) }}
        editTask={editTask}
        defaultCategory={defaultCat}
      />
    </div>
  )
}
