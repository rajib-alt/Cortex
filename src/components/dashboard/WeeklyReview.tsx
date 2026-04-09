import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, TrendingUp, Brain, Edit3, Target } from 'lucide-react'
import { useBlocksStore, BLOCK_TYPE_CONFIG } from '@/store/blocksStore'
import { useJournalStore, MOOD_CONFIG, Mood } from '@/store/journalStore'
import { useTasksStore } from '@/store/tasksStore'
import { useFinanceStore } from '@/store/financeStore'
import { Card, CardContent, CardHeader, CardTitle, Progress, Badge } from '@/components/ui'
import { cn, formatDate } from '@/lib/utils'

export default function WeeklyReview() {
  const { spaces } = useBlocksStore()
  const { entries } = useJournalStore()
  const { tasks } = useTasksStore()
  const { getMonthlyData, currency } = useFinanceStore()

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6)
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = now.toISOString().split('T')[0]

  const weekly = useMemo(() => {
    // Journal this week
    const weekEntries = entries.filter(e => e.date >= weekStartStr && e.date <= weekEndStr)
    const avgMood = weekEntries.length > 0
      ? weekEntries.reduce((s, e) => s + (e.mood || 3), 0) / weekEntries.length : 0
    const totalWords = weekEntries.reduce((s, e) => s + e.content.split(/\s+/).filter(Boolean).length, 0)

    // Blocks this week
    const weekBlocks = spaces.flatMap(sp => sp.blocks).filter(b => {
      const d = new Date(b.createdAt).toISOString().split('T')[0]
      return d >= weekStartStr && d <= weekEndStr
    })

    // Task completions this week
    const completedTasks = tasks.filter(t => t.status === 'done' && t.updatedAt >= weekStart.getTime())

    // Wins & goals from blocks
    const wins = weekBlocks.filter(b => b.type === 'win')
    const goals = weekBlocks.filter(b => b.type === 'goal')
    const learnings = weekBlocks.filter(b => b.type === 'learning')

    return { weekEntries, avgMood, totalWords, weekBlocks, completedTasks, wins, goals, learnings }
  }, [spaces, entries, tasks, weekStartStr, weekEndStr])

  const moods = weekly.weekEntries.filter(e => e.mood).map(e => ({ date: e.date, mood: e.mood as Mood }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">This Week</h2>
        <span className="text-xs text-muted-foreground">{formatDate(weekStart, 'short')} — {formatDate(now, 'short')}</span>
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { emoji: '🧠', label: 'thoughts', value: weekly.weekBlocks.length },
          { emoji: '📓', label: 'entries', value: weekly.weekEntries.length },
          { emoji: '✅', label: 'tasks done', value: weekly.completedTasks.length },
          { emoji: '🏆', label: 'wins', value: weekly.wins.length },
          { emoji: '🎓', label: 'learnings', value: weekly.learnings.length },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-sm">
            <span>{s.emoji}</span>
            <span className="font-medium text-foreground">{s.value}</span>
            <span className="text-muted-foreground text-xs">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Mood trend */}
      {moods.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Mood this week</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              {moods.map(({ date, mood }) => {
                const cfg = MOOD_CONFIG[mood]
                return (
                  <div key={date} className="flex flex-col items-center gap-1">
                    <span className="text-lg">{cfg.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(date).toLocaleDateString('en', { weekday: 'short' })}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wins */}
      {weekly.wins.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">🏆 Wins</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {weekly.wins.map(b => (
                <li key={b.id} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {b.text.slice(0, 100)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Learnings */}
      {weekly.learnings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">🎓 Learnings</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {weekly.learnings.map(b => (
                <li key={b.id} className="text-sm text-muted-foreground leading-relaxed">· {b.text.slice(0, 100)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {weekly.weekBlocks.length === 0 && weekly.weekEntries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Nothing captured this week yet.</p>
          <p className="text-xs mt-1">Start journaling or adding thoughts to see your weekly review.</p>
        </div>
      )}
    </div>
  )
}
