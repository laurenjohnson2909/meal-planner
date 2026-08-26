import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, PageHeader } from '../components/ui/Primitives'
import { useDeleteWeightLog, useWeightLogs } from '../hooks/useWeight'
import { useFoodLogRange } from '../hooks/useFoodLog'
import { useExerciseLogs } from '../hooks/useExercise'
import { useMealPlan } from '../hooks/useMealPlan'
import { useNutritionTargets } from '../hooks/useProfile'
import { addDaysToDate, dayLabel, movingAverage, weekStart } from '../lib/dates'
import { sumNutrition } from '../lib/nutrition'
import { useQuickAdd } from '../hooks/useQuickAdd'

export function Progress() {
  const quickAdd = useQuickAdd()
  const { data: weightLogs } = useWeightLogs()
  const del = useDeleteWeightLog()

  const week = weekStart()
  const weekEnd = addDaysToDate(week, 6)
  const { data: logsByDate } = useFoodLogRange(week, weekEnd)
  const { data: exerciseLogs } = useExerciseLogs(week, weekEnd)
  const { data: plan } = useMealPlan(week)
  const { data: targets } = useNutritionTargets()

  const dailyCalories = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDaysToDate(week, i)
      const items = logsByDate?.[date] ?? []
      return { date, calories: sumNutrition(items).calories }
    })
  }, [logsByDate, week])

  const daysWithData = dailyCalories.filter((d) => d.calories > 0)
  const avgCalories = daysWithData.length ? daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length : 0
  const allWeekItems = Object.values(logsByDate ?? {}).flat()
  const avgProtein = daysWithData.length
    ? sumNutrition(allWeekItems).protein_g / daysWithData.length
    : 0

  const totalExerciseMin = (exerciseLogs ?? []).reduce((s, e) => s + (e.duration_min ?? 0), 0)
  const plannedCount = (plan?.items ?? []).filter((i) => i.recipe || i.takeaway || i.free_text).length
  const loggedCount = Object.values(logsByDate ?? {}).flat().length
  const takeawayCount = allWeekItems.filter((i) => i.source_type === 'takeaway').length

  const weights = weightLogs ?? []
  const trend = movingAverage(weights.map((w) => w.weight_kg), 7)
  const current = weights.at(-1)?.weight_kg
  const starting = weights[0]?.weight_kg
  const change = current != null && starting != null ? current - starting : null

  return (
    <div className="space-y-5">
      <PageHeader title="Progress" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-text-dim">This week's average</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-lg font-semibold">{Math.round(avgCalories)}</p>
              <p className="text-xs text-text-dim">avg kcal / day (target {targets?.calories ?? '—'})</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{Math.round(avgProtein)}g</p>
              <p className="text-xs text-text-dim">avg protein / day (target {targets?.protein_g ?? '—'}g)</p>
            </div>
          </div>
          <div className="mt-3 flex items-end gap-1.5">
            {dailyCalories.map((d) => (
              <div key={d.date} className="flex-1 text-center">
                <div
                  className="mx-auto w-full rounded-t bg-primary/60"
                  style={{ height: `${Math.min(60, (d.calories / Math.max(targets?.calories ?? 2000, 1)) * 60)}px` }}
                />
                <p className="mt-1 text-[9px] text-text-dim">{dayLabel(d.date).slice(0, 3)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-semibold text-text-dim">This week's activity</h2>
          <ul className="space-y-1.5 text-sm">
            <li className="flex justify-between"><span className="text-text-dim">Exercise time</span><span>{totalExerciseMin} min</span></li>
            <li className="flex justify-between"><span className="text-text-dim">Planned meals</span><span>{plannedCount}</span></li>
            <li className="flex justify-between"><span className="text-text-dim">Logged meals</span><span>{loggedCount}</span></li>
            <li className="flex justify-between"><span className="text-text-dim">Takeaways</span><span>{takeawayCount}</span></li>
          </ul>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-dim">Weight</h2>
          <Button onClick={() => quickAdd.open('weight')}>
            <Plus size={16} /> Log weight
          </Button>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-text-dim">Current</p>
            <p className="font-semibold">{current != null ? `${current}kg` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-dim">Starting</p>
            <p className="font-semibold">{starting != null ? `${starting}kg` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-dim">Change</p>
            <p className={`font-semibold ${change != null && change < 0 ? 'text-primary' : ''}`}>
              {change != null ? `${change > 0 ? '+' : ''}${change.toFixed(1)}kg` : '—'}
            </p>
          </div>
        </div>

        {weights.length >= 2 && <WeightSparkline weights={weights.map((w) => w.weight_kg)} trend={trend} />}

        <div className="mt-3 space-y-1">
          {weights.slice(-8).reverse().map((w) => (
            <div key={w.id} className="flex items-center justify-between text-xs">
              <span className="text-text-dim">{dayLabel(w.date)}</span>
              <span>{w.weight_kg}kg</span>
              <button onClick={() => del.mutate(w.id)} className="text-text-dim hover:text-danger">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function WeightSparkline({ weights, trend }: { weights: number[]; trend: number[] }) {
  const width = 300
  const height = 60
  const min = Math.min(...weights) - 0.5
  const max = Math.max(...weights) + 0.5
  const toPoint = (values: number[]) =>
    values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * width
        const y = height - ((v - min) / Math.max(max - min, 0.1)) * height
        return `${x},${y}`
      })
      .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <polyline points={toPoint(weights)} fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
      <polyline points={toPoint(trend)} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
    </svg>
  )
}
