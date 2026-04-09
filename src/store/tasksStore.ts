import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'

export type TaskStatus = 'backlog' | 'active' | 'done' | 'blocked'
export type ParaCategory = 'projects' | 'areas' | 'resources' | 'archive'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  category: ParaCategory
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  tags: string[]
  subTasks: { id: string; text: string; done: boolean }[]
  createdAt: number
  updatedAt: number
}

interface TasksState {
  tasks: Task[]
  addTask: (data: Partial<Task> & { title: string }) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  setStatus: (id: string, status: TaskStatus) => void
  setCategory: (id: string, category: ParaCategory) => void
  toggleSubTask: (taskId: string, subId: string) => void
  getByCategory: (cat: ParaCategory) => Task[]
  getByStatus: (status: TaskStatus) => Task[]
  getOverdue: () => Task[]
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  backlog: { label: 'Backlog',  color: 'text-muted-foreground', bg: 'bg-muted' },
  active:  { label: 'Active',   color: 'text-blue-400',         bg: 'bg-blue-500/10' },
  done:    { label: 'Done',     color: 'text-green-400',        bg: 'bg-green-500/10' },
  blocked: { label: 'Blocked',  color: 'text-red-400',          bg: 'bg-red-500/10' },
}

export const PARA_CONFIG: Record<ParaCategory, { label: string; emoji: string; description: string }> = {
  projects:  { label: 'Projects',  emoji: '🚀', description: 'Active, time-bound goals' },
  areas:     { label: 'Areas',     emoji: '🏠', description: 'Ongoing responsibilities' },
  resources: { label: 'Resources', emoji: '📚', description: 'Reference material & ideas' },
  archive:   { label: 'Archive',   emoji: '📦', description: 'Completed or paused work' },
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (data) => set(s => ({
        tasks: [...s.tasks, {
          id: generateId(),
          title: data.title,
          description: data.description,
          status: data.status || 'backlog',
          category: data.category || 'projects',
          priority: data.priority || 'medium',
          dueDate: data.dueDate,
          tags: data.tags || [],
          subTasks: data.subTasks || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }]
      })),

      updateTask: (id, updates) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t)
      })),

      deleteTask: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),

      setStatus: (id, status) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, status, updatedAt: Date.now() } : t)
      })),

      setCategory: (id, category) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, category, updatedAt: Date.now() } : t)
      })),

      toggleSubTask: (taskId, subId) => set(s => ({
        tasks: s.tasks.map(t => t.id === taskId
          ? { ...t, subTasks: t.subTasks.map(st => st.id === subId ? { ...st, done: !st.done } : st) } : t)
      })),

      getByCategory: (cat) => get().tasks.filter(t => t.category === cat),
      getByStatus: (status) => get().tasks.filter(t => t.status === status),
      getOverdue: () => get().tasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
      ),
    }),
    { name: 'cortex-tasks' }
  )
)
