import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId, todayISO } from '@/lib/utils'

export type Mood = 1 | 2 | 3 | 4 | 5
export const MOOD_CONFIG: Record<Mood, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😔', label: 'Rough',   color: 'text-red-400' },
  2: { emoji: '😕', label: 'Low',     color: 'text-orange-400' },
  3: { emoji: '😐', label: 'Neutral', color: 'text-yellow-400' },
  4: { emoji: '🙂', label: 'Good',    color: 'text-green-400' },
  5: { emoji: '😄', label: 'Great',   color: 'text-blue-400' },
}

export interface JournalEntry {
  id: string
  date: string  // ISO date YYYY-MM-DD
  title: string
  content: string
  mood?: Mood
  tags: string[]
  gratitude: string[]
  intentions: string[]
  createdAt: number
  updatedAt: number
  isPrivate?: boolean
}

interface JournalState {
  entries: JournalEntry[]
  addEntry: (data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void
  deleteEntry: (id: string) => void
  getByDate: (date: string) => JournalEntry | undefined
  getTodayEntry: () => JournalEntry | undefined
  getOrCreateToday: () => JournalEntry
  searchEntries: (q: string) => JournalEntry[]
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (data) => {
        const id = generateId()
        const entry: JournalEntry = { ...data, id, createdAt: Date.now(), updatedAt: Date.now() }
        set(s => ({ entries: [entry, ...s.entries] }))
        return id
      },

      updateEntry: (id, updates) => set(s => ({
        entries: s.entries.map(e => e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e)
      })),

      deleteEntry: (id) => set(s => ({ entries: s.entries.filter(e => e.id !== id) })),

      getByDate: (date) => get().entries.find(e => e.date === date),

      getTodayEntry: () => get().getByDate(todayISO()),

      getOrCreateToday: () => {
        const today = todayISO()
        const existing = get().getByDate(today)
        if (existing) return existing
        const id = get().addEntry({
          date: today,
          title: `Journal — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
          content: '',
          tags: [],
          gratitude: [],
          intentions: [],
        })
        return get().entries.find(e => e.id === id)!
      },

      searchEntries: (q) => {
        const lower = q.toLowerCase()
        return get().entries.filter(e =>
          e.content.toLowerCase().includes(lower) ||
          e.title.toLowerCase().includes(lower) ||
          e.tags.some(t => t.toLowerCase().includes(lower))
        )
      },
    }),
    { name: 'cortex-journal' }
  )
)
