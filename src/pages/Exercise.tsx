import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, PageHeader } from '../components/ui/Primitives'
import { useDeleteExerciseLog, useExerciseLogs } from '../hooks/useExercise'
import { addDaysToDate, dayLabel, todayStr } from '../lib/dates'
import { useQuickAdd } from '../hooks/useQuickAdd'

export function Exercise() {
  const start = addDaysToDate(todayStr(), -30)
  const { data: logs } = useExerciseLogs(start, todayStr())
  const del = useDeleteExerciseLog()
  const quickAdd = useQuickAdd()

  const totalMinutes = (logs ?? []).reduce((sum, l) => sum + (l.duration_min ?? 0), 0)
  const totalBurned = (logs ?? []).reduce((sum, l) => sum + (l.calories_burned ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Exercise"
        action={
          <Button onClick={() => quickAdd.open('exercise')}>
            <Plus size={16} /> Add exercise
          </Button>
        }
      />

      <Card className="mb-4">
        <p className="text-xs text-text-dim">Last 30 days</p>
        <div className="mt-1 flex gap-6">
          <div>
            <p className="text-lg font-semibold">{totalMinutes}</p>
            <p className="text-xs text-text-dim">minutes</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{Math.round(totalBurned)}</p>
            <p className="text-xs text-text-dim">kcal burned</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-text-dim">
          Exercise calories are tracked separately and don't automatically add to your food allowance.
        </p>
      </Card>

      {!logs?.length ? (
        <EmptyState title="No exercise logged yet" />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{log.type}</p>
                <p className="text-xs text-text-dim">
                  {dayLabel(log.date)} · {log.duration_min} min · {log.intensity}
                  {log.calories_burned ? ` · ${log.calories_burned} kcal` : ''}
                </p>
                {log.notes && <p className="mt-0.5 text-xs text-text-dim">{log.notes}</p>}
              </div>
              <button onClick={() => del.mutate(log.id)} className="text-text-dim hover:text-danger">
                <Trash2 size={16} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
