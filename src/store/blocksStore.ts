import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'

export type BlockType =
  | 'general' | 'idea' | 'claim' | 'question' | 'task'
  | 'quote' | 'definition' | 'reflection' | 'learning'
  | 'reference' | 'goal' | 'win' | 'decision' | 'thesis'

export interface SubTask {
  id: string
  text: string
  isDone: boolean
  createdAt: number
}

export interface Block {
  id: string
  text: string
  type: BlockType
  category?: string
  annotation?: string
  isPinned?: boolean
  isEnriching?: boolean
  isError?: boolean
  subTasks?: SubTask[]
  tags?: string[]
  createdAt: number
  updatedAt: number
}

export interface Space {
  id: string
  name: string
  icon: string
  blocks: Block[]
  collapsedIds: string[]
}

export const BLOCK_TYPE_CONFIG: Record<BlockType, { label: string; color: string; emoji: string; description: string }> = {
  general:    { label: 'Note',       color: 'text-muted-foreground', emoji: '📝', description: 'General note' },
  idea:       { label: 'Idea',       color: 'text-yellow-400',       emoji: '💡', description: 'A new idea' },
  claim:      { label: 'Claim',      color: 'text-blue-400',         emoji: '🔵', description: 'An assertion or belief' },
  question:   { label: 'Question',   color: 'text-purple-400',       emoji: '❓', description: 'Open question' },
  task:       { label: 'Task',       color: 'text-green-400',        emoji: '✅', description: 'Action item' },
  quote:      { label: 'Quote',      color: 'text-amber-400',        emoji: '💬', description: 'Quoted insight' },
  definition: { label: 'Definition', color: 'text-cyan-400',         emoji: '📖', description: 'Meaning of a concept' },
  reflection: { label: 'Reflection', color: 'text-pink-400',         emoji: '🪞', description: 'Personal insight' },
  learning:   { label: 'Learning',   color: 'text-teal-400',         emoji: '🎓', description: 'Something learned' },
  reference:  { label: 'Reference',  color: 'text-orange-400',       emoji: '🔗', description: 'Link or source' },
  goal:       { label: 'Goal',       color: 'text-emerald-400',      emoji: '🎯', description: 'A target to reach' },
  win:        { label: 'Win',        color: 'text-lime-400',         emoji: '🏆', description: 'A victory or achievement' },
  decision:   { label: 'Decision',   color: 'text-violet-400',       emoji: '⚖️', description: 'A choice made' },
  thesis:     { label: 'Thesis',     color: 'text-rose-400',         emoji: '✨', description: 'Core thesis or insight' },
}

interface BlocksState {
  spaces: Space[]
  activeSpaceId: string
  setActiveSpace: (id: string) => void
  createSpace: (name: string, icon?: string) => string
  renameSpace: (id: string, name: string) => void
  deleteSpace: (id: string) => void
  addBlock: (text: string, type?: BlockType, category?: string) => void
  updateBlock: (spaceId: string, blockId: string, updates: Partial<Block>) => void
  deleteBlock: (spaceId: string, blockId: string) => void
  togglePin: (spaceId: string, blockId: string) => void
  toggleCollapse: (spaceId: string, blockId: string) => void
  addSubTask: (spaceId: string, blockId: string, text: string) => void
  toggleSubTask: (spaceId: string, blockId: string, subId: string) => void
  deleteSubTask: (spaceId: string, blockId: string, subId: string) => void
  getActiveSpace: () => Space | undefined
}

const DEFAULT_SPACE: Space = {
  id: 'default',
  name: 'Main Space',
  icon: '🧠',
  blocks: [],
  collapsedIds: [],
}

export const useBlocksStore = create<BlocksState>()(
  persist(
    (set, get) => ({
      spaces: [DEFAULT_SPACE],
      activeSpaceId: 'default',

      setActiveSpace: (id) => set({ activeSpaceId: id }),

      createSpace: (name, icon = '📂') => {
        const id = generateId()
        set(s => ({ spaces: [...s.spaces, { id, name, icon, blocks: [], collapsedIds: [] }] }))
        return id
      },

      renameSpace: (id, name) => set(s => ({
        spaces: s.spaces.map(sp => sp.id === id ? { ...sp, name } : sp)
      })),

      deleteSpace: (id) => set(s => {
        if (s.spaces.length <= 1) return s
        const next = s.spaces.filter(sp => sp.id !== id)
        return { spaces: next, activeSpaceId: s.activeSpaceId === id ? next[0].id : s.activeSpaceId }
      }),

      addBlock: (text, type = 'general', category) => {
        const { activeSpaceId } = get()
        const block: Block = {
          id: generateId(), text, type, category,
          createdAt: Date.now(), updatedAt: Date.now(),
        }
        set(s => ({
          spaces: s.spaces.map(sp => sp.id === activeSpaceId
            ? { ...sp, blocks: [...sp.blocks, block] } : sp)
        }))
      },

      updateBlock: (spaceId, blockId, updates) => set(s => ({
        spaces: s.spaces.map(sp => sp.id === spaceId
          ? { ...sp, blocks: sp.blocks.map(b => b.id === blockId ? { ...b, ...updates, updatedAt: Date.now() } : b) }
          : sp)
      })),

      deleteBlock: (spaceId, blockId) => set(s => ({
        spaces: s.spaces.map(sp => sp.id === spaceId
          ? { ...sp, blocks: sp.blocks.filter(b => b.id !== blockId) } : sp)
      })),

      togglePin: (spaceId, blockId) => set(s => ({
        spaces: s.spaces.map(sp => sp.id === spaceId
          ? { ...sp, blocks: sp.blocks.map(b => b.id === blockId ? { ...b, isPinned: !b.isPinned } : b) }
          : sp)
      })),

      toggleCollapse: (spaceId, blockId) => set(s => ({
        spaces: s.spaces.map(sp => {
          if (sp.id !== spaceId) return sp
          const next = new Set(sp.collapsedIds)
          if (next.has(blockId)) next.delete(blockId); else next.add(blockId)
          return { ...sp, collapsedIds: [...next] }
        })
      })),

      addSubTask: (spaceId, blockId, text) => set(s => ({
        spaces: s.spaces.map(sp => sp.id === spaceId
          ? { ...sp, blocks: sp.blocks.map(b => b.id === blockId
              ? { ...b, subTasks: [...(b.subTasks || []), { id: generateId(), text, isDone: false, createdAt: Date.now() }] } : b) }
          : sp)
      })),

      toggleSubTask: (spaceId, blockId, subId) => set(s => ({
        spaces: s.spaces.map(sp => sp.id === spaceId
          ? { ...sp, blocks: sp.blocks.map(b => b.id === blockId
              ? { ...b, subTasks: b.subTasks?.map(st => st.id === subId ? { ...st, isDone: !st.isDone } : st) } : b) }
          : sp)
      })),

      deleteSubTask: (spaceId, blockId, subId) => set(s => ({
        spaces: s.spaces.map(sp => sp.id === spaceId
          ? { ...sp, blocks: sp.blocks.map(b => b.id === blockId
              ? { ...b, subTasks: b.subTasks?.filter(st => st.id !== subId) } : b) }
          : sp)
      })),

      getActiveSpace: () => {
        const { spaces, activeSpaceId } = get()
        return spaces.find(sp => sp.id === activeSpaceId)
      },
    }),
    { name: 'cortex-blocks' }
  )
)
