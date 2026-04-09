import { useMemo } from 'react'
import { useJournalStore, MOOD_CONFIG, Mood } from '@/store/journalStore'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface HeatmapProps {
  onSelectDate?: (date: string) => void
  selectedDate?: string
}

export default function JournalHeatmap({ onSelectDate, selectedDate }: HeatmapProps) {
  const { entries } = useJournalStore()

  const { weeks, monthLabels, streak, totalEntries } = useMemo(() => {
    const today = new Date()
    const entryMap = new Map(entries.map(e => [e.date, e]))

    // Build 52 weeks back from today
    const days: { date: string; hasEntry: boolean; mood?: Mood; isToday: boolean; isFuture: boolean }[] = []
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (52 * 7) + 1)
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const cur = new Date(startDate)
    while (cur <= today || days.length % 7 !== 0) {
      const dateStr = cur.toISOString().split('T')[0]
      const entry = entryMap.get(dateStr)
      days.push({
        date: dateStr,
        hasEntry: !!entry,
        mood: entry?.mood,
        isToday: dateStr === today.toISOString().split('T')[0],
        isFuture: cur > today,
      })
      cur.setDate(cur.getDate() + 1)
    }

    // Group into weeks
    const weeksArr: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) weeksArr.push(days.slice(i, i + 7))

    // Month labels
    const labels: { label: string; weekIdx: number }[] = []
    let lastMonth = -1
    weeksArr.forEach((week, wi) => {
      const m = new Date(week[0].date).getMonth()
      if (m !== lastMonth) { labels.push({ label: MONTHS_SHORT[m], weekIdx: wi }); lastMonth = m }
    })

    // Streak
    let streak = 0
    const todayStr = today.toISOString().split('T')[0]
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const s = d.toISOString().split('T')[0]
      if (entryMap.has(s)) streak++
      else if (i > 0) break
    }

    return { weeks: weeksArr, monthLabels: labels, streak, totalEntries: entries.length }
  }, [entries])

  const getDayColor = (day: { hasEntry: boolean; mood?: Mood; isFuture: boolean; isToday: boolean }) => {
    if (day.isFuture) return 'bg-transparent'
    if (!day.hasEntry) return 'bg-muted hover:bg-muted/80'
    if (day.mood) {
      const moodColors: Record<Mood, string> = {
        1: 'bg-red-500/70 hover:bg-red-500',
        2: 'bg-orange-500/70 hover:bg-orange-500',
        3: 'bg-yellow-500/70 hover:bg-yellow-500',
        4: 'bg-green-500/70 hover:bg-green-500',
        5: 'bg-blue-500/70 hover:bg-blue-500',
      }
      return moodColors[day.mood]
    }
    return 'bg-primary/60 hover:bg-primary'
  }

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-heading font-bold text-primary">{streak}</span>
          <div>
            <p className="text-xs font-medium text-foreground">Day streak</p>
            <p className="text-[10px] text-muted-foreground">Keep it up!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-heading font-bold text-foreground">{totalEntries}</span>
          <div>
            <p className="text-xs font-medium text-foreground">Total entries</p>
            <p className="text-[10px] text-muted-foreground">All time</p>
          </div>
        </div>
        {/* Mood legend */}
        <div className="ml-auto flex items-center gap-2">
          {([1, 2, 3, 4, 5] as Mood[]).map(m => (
            <div key={m} className="flex items-center gap-1">
              <div className={cn('h-2.5 w-2.5 rounded-sm', getDayColor({ hasEntry: true, mood: m, isFuture: false, isToday: false }))} />
              <span className="text-[10px] text-muted-foreground">{MOOD_CONFIG[m].emoji}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          {/* Month labels */}
          <div className="flex gap-1 ml-6">
            {weeks.map((_, wi) => {
              const label = monthLabels.find(l => l.weekIdx === wi)
              return (
                <div key={wi} className="w-3 text-[8px] text-muted-foreground" style={{ minWidth: '12px' }}>
                  {label?.label || ''}
                </div>
              )
            })}
          </div>

          {/* Grid: 7 rows (days) × N cols (weeks) */}
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-1">
              {DAYS.map((d, i) => (
                <div key={d} className="h-3 text-[8px] text-muted-foreground flex items-center" style={{ minHeight: '12px' }}>
                  {i % 2 === 1 ? d.slice(0, 1) : ''}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <button
                    key={day.date}
                    title={`${day.date}${day.hasEntry ? (day.mood ? ` · ${MOOD_CONFIG[day.mood].label}` : ' · Entry') : ''}`}
                    onClick={() => !day.isFuture && onSelectDate?.(day.date)}
                    className={cn(
                      'h-3 w-3 rounded-sm transition-all',
                      getDayColor(day),
                      day.isToday && 'ring-1 ring-primary ring-offset-1 ring-offset-background',
                      selectedDate === day.date && 'ring-2 ring-white ring-offset-1 ring-offset-background',
                      day.isFuture && 'cursor-default',
                      !day.isFuture && 'cursor-pointer'
                    )}
                    style={{ minWidth: '12px', minHeight: '12px' }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
