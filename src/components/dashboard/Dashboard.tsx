import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Brain, BookOpen, Edit3, DollarSign, CheckSquare, TrendingUp,
  TrendingDown, Flame, Target, Calendar, AlertCircle, FileText,
  Hash, Link2, ArrowRight, LayoutDashboard, CalendarDays, GraduationCap
} from 'lucide-react'
import { useBlocksStore } from '@/store/blocksStore'
import { useJournalStore, MOOD_CONFIG } from '@/store/journalStore'
import { useFinanceStore } from '@/store/financeStore'
import { useTasksStore } from '@/store/tasksStore'
import { useNotesStore } from '@/store/notesStore'
import { useLearningStore } from '@/store/learningStore'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Progress } from '@/components/ui'
import { cn, formatDate, todayISO, wordCount } from '@/lib/utils'
import type { Mood } from '@/store/journalStore'
import WeeklyReview from './WeeklyReview'

function StatCard({ icon: Icon, label, value, sub, color = '', onClick }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string; onClick?: () => void
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={cn('p-4 rounded-xl border border-border bg-card cursor-pointer transition-colors hover:border-border/80', onClick && 'hover:bg-secondary/50')}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={cn('h-4 w-4', color || 'text-muted-foreground')} />
      </div>
      <p className={cn('font-heading text-2xl font-bold', color || 'text-foreground')}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  )
}

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { spaces } = useBlocksStore()
  const { entries } = useJournalStore()
  const { transactions, getMonthlyData, currency } = useFinanceStore()
  const { tasks, getOverdue } = useTasksStore()
  const { files, tags, backlinks } = useNotesStore()
  const learningStats = useLearningStore(s => s.getStats())
  const [view, setView] = useState<'overview' | 'weekly'>('overview')

  const now = new Date()
  const monthly = getMonthlyData(now.getFullYear(), now.getMonth() + 1)
  const overdue = getOverdue()

  // Stats
  const totalBlocks = spaces.reduce((s, sp) => s + sp.blocks.length, 0)
  const recentEntries = entries.slice(0, 5)
  const todayEntry = entries.find(e => e.date === todayISO())
  const savingsRate = monthly.income > 0 ? Math.round(((monthly.income - monthly.expense) / monthly.income) * 100) : 0

  // Note stats
  const noteCount = useMemo(() => {
    let c = 0
    const walk = (nodes: typeof files) => { for (const n of nodes) { if (!n.isFolder) c++; if (n.children) walk(n.children) } }
    walk(files)
    return c
  }, [files])

  const totalWords = useMemo(() => {
    let w = 0
    const walk = (nodes: typeof files) => { for (const n of nodes) { if (n.content) w += wordCount(n.content); if (n.children) walk(n.children) } }
    walk(files)
    return w
  }, [files])

  // Streak calculation
  const journalStreak = useMemo(() => {
    let streak = 0
    const today = new Date(todayISO())
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      if (entries.find(e => e.date === dateStr)) streak++
      else if (i > 0) break
    }
    return streak
  }, [entries])

  // Recent blocks
  const recentBlocks = useMemo(() => {
    return spaces.flatMap(sp => sp.blocks).sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)
  }, [spaces])

  const activeTasks = tasks.filter(t => t.status === 'active').slice(0, 5)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Greeting + view toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{formatDate(now, 'long')}</p>
          </div>
          <div className="flex items-center gap-3">
            {todayEntry?.mood && (
              <div className="text-center">
                <div className="text-3xl">{MOOD_CONFIG[todayEntry.mood].emoji}</div>
                <p className="text-[10px] text-muted-foreground">{MOOD_CONFIG[todayEntry.mood].label}</p>
              </div>
            )}
            <div className="flex gap-1 bg-secondary rounded-lg p-1">
              <button onClick={() => setView('overview')} className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5', view === 'overview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
                <LayoutDashboard className="h-3 w-3" />Overview
              </button>
              <button onClick={() => setView('weekly')} className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5', view === 'weekly' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
                <CalendarDays className="h-3 w-3" />This Week
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {overdue.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>You have {overdue.length} overdue task{overdue.length > 1 ? 's' : ''}</span>
            <Button size="sm" variant="ghost" className="ml-auto text-red-400 hover:text-red-300" onClick={() => onNavigate('tasks')}>View →</Button>
          </div>
        )}

        {/* Weekly view */}
        {view === 'weekly' && <WeeklyReview />}

        {/* Overview view */}
        {view === 'overview' && (<>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Brain}          label="Thoughts"  value={totalBlocks}           color="text-yellow-400" onClick={() => onNavigate('thoughts')} />
          <StatCard icon={FileText}       label="Notes"     value={noteCount}              color="text-blue-400"   onClick={() => onNavigate('notes')} />
          <StatCard icon={Edit3}          label="Journal"   value={entries.length}         sub={`${journalStreak}d streak`} color="text-pink-400" onClick={() => onNavigate('journal')} />
          <StatCard icon={CheckSquare}    label="Tasks"     value={tasks.length}           sub={`${activeTasks.length} active`} color="text-green-400" onClick={() => onNavigate('tasks')} />
          <StatCard icon={TrendingUp}     label="Income"    value={`${(monthly.income / 1000).toFixed(1)}k`} sub={currency} color="text-emerald-400" onClick={() => onNavigate('finance')} />
          <StatCard icon={Target}         label="Savings"   value={`${savingsRate}%`}      sub="this month" color={savingsRate > 20 ? 'text-primary' : 'text-muted-foreground'} onClick={() => onNavigate('finance')} />
        </div>

        {/* Learning row */}
        {learningStats.total > 0 && (
          <div
            className="flex items-center gap-4 px-4 py-3 rounded-xl bg-teal-500/5 border border-teal-500/20 cursor-pointer hover:bg-teal-500/10 transition-colors"
            onClick={() => onNavigate('learning')}
          >
            <GraduationCap className="h-4 w-4 text-teal-400 shrink-0" />
            <span className="text-sm text-foreground font-medium">Learning Library</span>
            <span className="text-xs text-muted-foreground">{learningStats.total} items · {learningStats.mastered} mastered</span>
            {learningStats.dueToday > 0 && (
              <Badge variant="default" className="ml-auto text-xs gap-1">
                ⏰ {learningStats.dueToday} due today
              </Badge>
            )}
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}

        {/* Main grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Today's journal */}
          <Card className="cursor-pointer hover:border-border/80 transition-colors" onClick={() => onNavigate('journal')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Edit3 className="h-4 w-4 text-pink-400" />Today's Journal
                <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayEntry ? (
                <div className="space-y-2">
                  {todayEntry.mood && <div className="flex items-center gap-2"><span className="text-xl">{MOOD_CONFIG[todayEntry.mood as Mood].emoji}</span><span className="text-sm text-muted-foreground">{MOOD_CONFIG[todayEntry.mood as Mood].label}</span></div>}
                  <p className="text-sm text-muted-foreground line-clamp-3">{todayEntry.content || 'Open to write…'}</p>
                  {todayEntry.gratitude.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="text-pink-400">❤️ Grateful: </span>{todayEntry.gratitude[0]}{todayEntry.gratitude.length > 1 ? ` +${todayEntry.gratitude.length - 1}` : ''}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No entry yet today. Start your daily reflection.</p>
              )}
            </CardContent>
          </Card>

          {/* Active tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckSquare className="h-4 w-4 text-green-400" />Active Tasks
                <button className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" onClick={() => onNavigate('tasks')}>
                  All <ArrowRight className="h-3 w-3" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active tasks. You're clear! 🎉</p>
              ) : (
                <div className="space-y-2">
                  {activeTasks.map(t => (
                    <div key={t.id} className="flex items-start gap-2">
                      <span className={cn('mt-0.5 shrink-0 text-sm', t.priority === 'high' ? 'text-red-400' : t.priority === 'medium' ? 'text-yellow-400' : 'text-muted-foreground')}>●</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{t.title}</p>
                        {t.dueDate && <p className="text-[10px] text-muted-foreground">{formatDate(t.dueDate)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent thoughts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-yellow-400" />Recent Thoughts
                <button className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" onClick={() => onNavigate('thoughts')}>
                  All <ArrowRight className="h-3 w-3" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Capture your first thought in Thoughts.</p>
              ) : (
                <div className="space-y-2">
                  {recentBlocks.map(b => {
                    const cfg = { emoji: '📝', label: 'Note' } // simplified
                    return (
                      <div key={b.id} className="flex items-start gap-2">
                        <span className="text-sm shrink-0">{({ idea: '💡', reflection: '🪞', learning: '🎓', goal: '🎯', win: '🏆', decision: '⚖️', claim: '🔵', question: '❓', quote: '💬', task: '✅', definition: '📖', reference: '🔗', thesis: '✨', general: '📝' } as any)[b.type] || '📝'}</span>
                        <p className="text-xs text-muted-foreground line-clamp-2">{b.text}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Finance snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-primary" />This Month ({currency})
                <button className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" onClick={() => onNavigate('finance')}>
                  All <ArrowRight className="h-3 w-3" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-green-400" />Income</span>
                <span className="text-green-400 font-mono">{monthly.income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5 text-red-400" />Expenses</span>
                <span className="text-red-400 font-mono">{monthly.expense.toLocaleString()}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between text-sm font-medium">
                <span>Net</span>
                <span className={cn('font-mono', monthly.net >= 0 ? 'text-green-400' : 'text-red-400')}>{monthly.net >= 0 ? '+' : ''}{monthly.net.toLocaleString()}</span>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Savings rate</span><span>{savingsRate}%</span>
                </div>
                <Progress value={savingsRate} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes stats */}
        {noteCount > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-blue-400" />Knowledge Base</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="font-heading text-2xl font-bold text-foreground">{noteCount}</p>
                  <p className="text-xs text-muted-foreground">Notes</p>
                </div>
                <div className="text-center">
                  <p className="font-heading text-2xl font-bold text-foreground">{tags.length}</p>
                  <p className="text-xs text-muted-foreground">Tags</p>
                </div>
                <div className="text-center">
                  <p className="font-heading text-2xl font-bold text-foreground">{totalWords.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Words</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </>)}
      </div>
    </div>
  )
}
