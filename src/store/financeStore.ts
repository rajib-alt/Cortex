import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId, todayISO } from '@/lib/utils'

export type TxType = 'Income' | 'Expense'

export interface Transaction {
  id: string
  date: string
  amount: number
  currency: string
  type: string
  incomeExpense: TxType
  description: string
  note?: string
  tags?: string[]
}

export interface Budget {
  id: string
  category: string
  limit: number
  period: 'monthly' | 'yearly'
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  emoji?: string
}

const INCOME_TYPES = ['Salary', 'Side Hustle', 'Freelance', 'Interest / Dividends', 'Gifts / Other', 'Rental', 'Other Income']
const EXPENSE_TYPES = [
  'Rent / Mortgage', 'Utilities', 'Groceries', 'Eating Out', 'Transport',
  'Healthcare', 'Education', 'Entertainment', 'Clothing', 'Personal Care',
  'Subscription', 'Family', 'Charity / Zakat', 'Savings Transfer', 'Other Expense'
]

export const ALL_INCOME_TYPES = INCOME_TYPES
export const ALL_EXPENSE_TYPES = EXPENSE_TYPES
export const ALL_TX_TYPES = [...INCOME_TYPES, ...EXPENSE_TYPES]

interface FinanceState {
  transactions: Transaction[]
  budgets: Budget[]
  savingsGoals: SavingsGoal[]
  currency: string
  setCurrency: (c: string) => void
  addTransaction: (data: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  addBudget: (data: Omit<Budget, 'id'>) => void
  deleteBudget: (id: string) => void
  addSavingsGoal: (data: Omit<SavingsGoal, 'id'>) => void
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void
  deleteSavingsGoal: (id: string) => void
  getMonthlyData: (year: number, month: number) => { income: number; expense: number; net: number }
  getByMonth: (year: number, month: number) => Transaction[]
  getTotalsByType: (txs: Transaction[]) => Record<string, number>
  getNetWorth: () => number
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      budgets: [],
      savingsGoals: [],
      currency: 'BDT',

      setCurrency: (c) => set({ currency: c }),

      addTransaction: (data) => set(s => ({
        transactions: [{ ...data, id: generateId() }, ...s.transactions]
      })),

      updateTransaction: (id, updates) => set(s => ({
        transactions: s.transactions.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

      deleteTransaction: (id) => set(s => ({
        transactions: s.transactions.filter(t => t.id !== id)
      })),

      addBudget: (data) => set(s => ({ budgets: [...s.budgets, { ...data, id: generateId() }] })),
      deleteBudget: (id) => set(s => ({ budgets: s.budgets.filter(b => b.id !== id) })),

      addSavingsGoal: (data) => set(s => ({ savingsGoals: [...s.savingsGoals, { ...data, id: generateId() }] })),
      updateSavingsGoal: (id, updates) => set(s => ({
        savingsGoals: s.savingsGoals.map(g => g.id === id ? { ...g, ...updates } : g)
      })),
      deleteSavingsGoal: (id) => set(s => ({ savingsGoals: s.savingsGoals.filter(g => g.id !== id) })),

      getByMonth: (year, month) => get().transactions.filter(t => {
        const d = new Date(t.date)
        return d.getFullYear() === year && d.getMonth() + 1 === month
      }),

      getMonthlyData: (year, month) => {
        const txs = get().getByMonth(year, month)
        const income = txs.filter(t => t.incomeExpense === 'Income').reduce((s, t) => s + t.amount, 0)
        const expense = txs.filter(t => t.incomeExpense === 'Expense').reduce((s, t) => s + t.amount, 0)
        return { income, expense, net: income - expense }
      },

      getTotalsByType: (txs) => {
        const totals: Record<string, number> = {}
        for (const t of txs) totals[t.type] = (totals[t.type] || 0) + t.amount
        return totals
      },

      getNetWorth: () => {
        const all = get().transactions
        const income = all.filter(t => t.incomeExpense === 'Income').reduce((s, t) => s + t.amount, 0)
        const expense = all.filter(t => t.incomeExpense === 'Expense').reduce((s, t) => s + t.amount, 0)
        const goals = get().savingsGoals.reduce((s, g) => s + g.currentAmount, 0)
        return income - expense + goals
      },
    }),
    { name: 'cortex-finance' }
  )
)
