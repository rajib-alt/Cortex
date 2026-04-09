import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Plus, Trash2, DollarSign,
  Target, Wallet, PiggyBank, BarChart2, List
} from 'lucide-react'
import { useFinanceStore, ALL_INCOME_TYPES, ALL_EXPENSE_TYPES, ALL_TX_TYPES } from '@/store/financeStore'
import {
  Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Card, CardHeader, CardTitle, CardContent, Progress
} from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CHART_COLORS = ['#f59e0b','#3b82f6','#10b981','#f43f5e','#8b5cf6','#06b6d4','#ec4899','#84cc16']

// ─── Add Transaction Modal ────────────────────────────────────────────────────
function AddTxModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTransaction, currency } = useFinanceStore()
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    incomeExpense: 'Expense' as 'Income' | 'Expense',
    type: 'Groceries',
    description: '',
    note: '',
  })

  const types = form.incomeExpense === 'Income' ? ALL_INCOME_TYPES : ALL_EXPENSE_TYPES

  const submit = () => {
    if (!form.amount || !form.date) return
    addTransaction({ ...form, amount: parseFloat(form.amount), currency, tags: [] })
    setForm({ date: new Date().toISOString().split('T')[0], amount: '', incomeExpense: 'Expense', type: 'Groceries', description: '', note: '' })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, incomeExpense: 'Income', type: ALL_INCOME_TYPES[0] }))}
              className={cn('py-2 rounded-lg text-sm font-medium transition-colors', form.incomeExpense === 'Income' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-secondary text-muted-foreground')}
            >+ Income</button>
            <button
              onClick={() => setForm(f => ({ ...f, incomeExpense: 'Expense', type: ALL_EXPENSE_TYPES[0] }))}
              className={cn('py-2 rounded-lg text-sm font-medium transition-colors', form.incomeExpense === 'Expense' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-secondary text-muted-foreground')}
            >− Expense</button>
          </div>
          <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <Button className="w-full" onClick={submit}>Add Transaction</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Savings Goal Card ────────────────────────────────────────────────────────
function SavingsGoalCard() {
  const { savingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, currency } = useFinanceStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', targetAmount: '', currentAmount: '', emoji: '🎯', deadline: '' })

  const submit = () => {
    if (!form.name || !form.targetAmount) return
    addSavingsGoal({ name: form.name, targetAmount: parseFloat(form.targetAmount), currentAmount: parseFloat(form.currentAmount) || 0, emoji: form.emoji, deadline: form.deadline || undefined })
    setForm({ name: '', targetAmount: '', currentAmount: '', emoji: '🎯', deadline: '' })
    setShowAdd(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><PiggyBank className="h-4 w-4 text-primary" />Savings Goals</CardTitle>
        <Button size="icon-sm" variant="ghost" onClick={() => setShowAdd(s => !s)}><Plus className="h-3.5 w-3.5" /></Button>
      </CardHeader>
      <CardContent>
        {showAdd && (
          <div className="mb-4 p-3 rounded-lg bg-secondary space-y-2">
            <div className="flex gap-2">
              <Input className="w-12" placeholder="🎯" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} />
              <Input placeholder="Goal name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Target amount" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} />
              <Input type="number" placeholder="Saved so far" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} />
            </div>
            <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            <Button className="w-full" size="sm" onClick={submit}>Add Goal</Button>
          </div>
        )}
        <div className="space-y-3">
          {savingsGoals.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No savings goals yet. Add one!</p>}
          {savingsGoals.map(g => {
            const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
            return (
              <div key={g.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{g.emoji} {g.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{g.currentAmount.toLocaleString()} / {g.targetAmount.toLocaleString()} {currency}</span>
                    <button onClick={() => deleteSavingsGoal(g.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{pct}% saved</span>
                  {g.deadline && <span>Due {formatDate(g.deadline)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Finance Dashboard ───────────────────────────────────────────────────
export default function FinanceDashboard() {
  const { transactions, currency, getMonthlyData, getByMonth, getTotalsByType, getNetWorth, deleteTransaction } = useFinanceStore()
  const [showAdd, setShowAdd] = useState(false)
  const [view, setView] = useState<'overview' | 'transactions' | 'goals'>('overview')

  const now = new Date()
  const [selYear, setSelYear] = useState(now.getFullYear())
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)

  const monthly = useMemo(() => getMonthlyData(selYear, selMonth), [transactions, selYear, selMonth])
  const monthTxs = useMemo(() => getByMonth(selYear, selMonth).sort((a, b) => b.date.localeCompare(a.date)), [transactions, selYear, selMonth])
  const netWorth = getNetWorth()

  const expenseTxs = monthTxs.filter(t => t.incomeExpense === 'Expense')
  const expenseByType = getTotalsByType(expenseTxs)
  const pieData = Object.entries(expenseByType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)

  const yearData = useMemo(() => MONTHS.map((month, i) => {
    const d = getMonthlyData(selYear, i + 1)
    return { month, income: d.income, expense: d.expense, net: d.net }
  }), [transactions, selYear])

  const savingsRate = monthly.income > 0 ? Math.round(((monthly.income - monthly.expense) / monthly.income) * 100) : 0

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="font-heading font-semibold text-sm flex-1">Finance</span>
        <div className="flex items-center gap-2">
          {/* Month selector */}
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" onClick={() => { if (selMonth === 1) { setSelMonth(12); setSelYear(y => y - 1) } else setSelMonth(m => m - 1) }}>‹</Button>
            <span className="text-xs text-muted-foreground w-20 text-center">{MONTHS[selMonth - 1]} {selYear}</span>
            <Button size="icon-sm" variant="ghost" onClick={() => { if (selMonth === 12) { setSelMonth(1); setSelYear(y => y + 1) } else setSelMonth(m => m + 1) }}>›</Button>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 shrink-0">
        {(['overview', 'transactions', 'goals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors', view === t ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary')}
          >{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {view === 'overview' && (
          <div className="space-y-4 pt-3">
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Income', value: monthly.income, icon: TrendingUp, color: 'text-green-400' },
                { label: 'Expense', value: monthly.expense, icon: TrendingDown, color: 'text-red-400' },
                { label: 'Net', value: monthly.net, icon: DollarSign, color: monthly.net >= 0 ? 'text-green-400' : 'text-red-400' },
                { label: 'Savings Rate', value: savingsRate, icon: Target, color: 'text-primary', suffix: '%' },
              ].map(kpi => (
                <Card key={kpi.label} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                    <kpi.icon className={cn('h-3.5 w-3.5', kpi.color)} />
                  </div>
                  <p className={cn('font-heading text-lg font-bold', kpi.color)}>
                    {kpi.suffix ? `${kpi.value}${kpi.suffix}` : `${kpi.value.toLocaleString()} ${currency}`}
                  </p>
                </Card>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Monthly Overview — {selYear}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={yearData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="income" fill="hsl(142 70% 45%)" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="expense" fill="hsl(0 72% 50%)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Expenses by Category</CardTitle></CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">No expenses this month</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                          {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Net worth trend */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2">
                <span>Cumulative Net — {selYear}</span>
                <Badge variant={netWorth >= 0 ? 'success' : 'destructive'}>{netWorth.toLocaleString()} {currency}</Badge>
              </CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={yearData.map((d, i) => ({ ...d, cumNet: yearData.slice(0, i + 1).reduce((s, x) => s + x.net, 0) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="cumNet" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {view === 'transactions' && (
          <div className="pt-3 space-y-2">
            {monthTxs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No transactions this month</p>
                <Button size="sm" className="mt-3" onClick={() => setShowAdd(true)}>Add your first</Button>
              </div>
            )}
            {monthTxs.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border hover:border-border/80 group transition-colors">
                <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-lg shrink-0', t.incomeExpense === 'Income' ? 'bg-green-500/10' : 'bg-red-500/10')}>
                  {t.incomeExpense === 'Income' ? '↑' : '↓'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.description || t.type}</p>
                  <p className="text-[10px] text-muted-foreground">{t.type} · {formatDate(t.date)}</p>
                </div>
                <span className={cn('font-mono text-sm font-medium shrink-0', t.incomeExpense === 'Income' ? 'text-green-400' : 'text-red-400')}>
                  {t.incomeExpense === 'Income' ? '+' : '−'}{t.amount.toLocaleString()} {currency}
                </span>
                <button onClick={() => deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {view === 'goals' && (
          <div className="pt-3">
            <SavingsGoalCard />
          </div>
        )}
      </div>

      <AddTxModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}
