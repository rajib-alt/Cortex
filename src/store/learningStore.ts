import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId, todayISO } from '@/lib/utils'

export type LearningStatus = 'new' | 'learning' | 'review' | 'mastered'
export type LearningCategory = 'marketing' | 'technology' | 'finance' | 'language' | 'health' | 'philosophy' | 'career' | 'other'

export interface LearningItem {
  id: string
  title: string
  content: string          // The knowledge / notes
  source?: string          // Book, article, course, URL
  category: LearningCategory
  status: LearningStatus
  tags: string[]
  reviewCount: number
  nextReviewDate: string   // ISO date
  lastReviewDate?: string
  ease: number             // SM-2 ease factor (default 2.5)
  interval: number         // days until next review
  createdAt: number
  updatedAt: number
}

// SM-2 algorithm
function sm2(item: LearningItem, quality: 0 | 1 | 2 | 3 | 4 | 5): { interval: number; ease: number; nextDate: string } {
  let { ease, interval, reviewCount } = item
  const newEase = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  let newInterval: number
  if (quality < 3) {
    newInterval = 1
  } else if (reviewCount === 0) {
    newInterval = 1
  } else if (reviewCount === 1) {
    newInterval = 6
  } else {
    newInterval = Math.round(interval * newEase)
  }
  const next = new Date()
  next.setDate(next.getDate() + newInterval)
  return { interval: newInterval, ease: newEase, nextDate: next.toISOString().split('T')[0] }
}

export const CATEGORY_CONFIG: Record<LearningCategory, { label: string; emoji: string; color: string }> = {
  marketing:   { label: 'Marketing',   emoji: '📣', color: 'text-orange-400' },
  technology:  { label: 'Technology',  emoji: '💻', color: 'text-blue-400'   },
  finance:     { label: 'Finance',     emoji: '💰', color: 'text-yellow-400' },
  language:    { label: 'Language',    emoji: '🗣️', color: 'text-green-400'  },
  health:      { label: 'Health',      emoji: '🏃', color: 'text-red-400'    },
  philosophy:  { label: 'Philosophy',  emoji: '🔮', color: 'text-purple-400' },
  career:      { label: 'Career',      emoji: '🚀', color: 'text-cyan-400'   },
  other:       { label: 'Other',       emoji: '📚', color: 'text-muted-foreground' },
}

export const STATUS_COLORS: Record<LearningStatus, string> = {
  new:      'text-muted-foreground',
  learning: 'text-blue-400',
  review:   'text-yellow-400',
  mastered: 'text-green-400',
}

interface LearningState {
  items: LearningItem[]
  addItem: (data: Omit<LearningItem, 'id' | 'reviewCount' | 'ease' | 'interval' | 'nextReviewDate' | 'createdAt' | 'updatedAt'>) => void
  updateItem: (id: string, updates: Partial<LearningItem>) => void
  deleteItem: (id: string) => void
  reviewItem: (id: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => void
  getDueToday: () => LearningItem[]
  getByCategory: (cat: LearningCategory) => LearningItem[]
  getStats: () => { total: number; dueToday: number; mastered: number; learningStreak: number }
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (data) => {
        const today = todayISO()
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        set(s => ({
          items: [...s.items, {
            ...data,
            id: generateId(),
            reviewCount: 0,
            ease: 2.5,
            interval: 1,
            nextReviewDate: today,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }]
        }))
      },

      updateItem: (id, updates) => set(s => ({
        items: s.items.map(i => i.id === id ? { ...i, ...updates, updatedAt: Date.now() } : i)
      })),

      deleteItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),

      reviewItem: (id, quality) => set(s => ({
        items: s.items.map(item => {
          if (item.id !== id) return item
          const { interval, ease, nextDate } = sm2(item, quality)
          const newStatus: LearningStatus = quality >= 4 ? (item.reviewCount >= 4 ? 'mastered' : 'review')
                                          : quality >= 2 ? 'learning' : 'new'
          return {
            ...item,
            ease, interval,
            nextReviewDate: nextDate,
            lastReviewDate: todayISO(),
            reviewCount: item.reviewCount + 1,
            status: newStatus,
            updatedAt: Date.now(),
          }
        })
      })),

      getDueToday: () => {
        const today = todayISO()
        return get().items.filter(i => i.nextReviewDate <= today && i.status !== 'mastered')
      },

      getByCategory: (cat) => get().items.filter(i => i.category === cat),

      getStats: () => {
        const items = get().items
        const today = todayISO()
        return {
          total: items.length,
          dueToday: items.filter(i => i.nextReviewDate <= today && i.status !== 'mastered').length,
          mastered: items.filter(i => i.status === 'mastered').length,
          learningStreak: 0, // could be computed from review dates
        }
      },
    }),
    { name: 'cortex-learning' }
  )
)
