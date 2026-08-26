import { useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, Lock, Plus, Sparkles, Trash2, Unlock } from 'lucide-react'
import { Button, Card, PageHeader } from '../components/ui/Primitives'
import { AssignMealModal } from '../components/plan/AssignMealModal'
import { OptimiseModal } from '../components/plan/OptimiseModal'
import { useDeletePlanItem, useDuplicatePlanItem, useMealPlan, useUpdatePlanItem } from '../hooks/useMealPlan'
import { addDaysToDate, dayLabel, weekStart } from '../lib/dates'
import { DAYS_OF_WEEK, MEAL_SLOTS } from '../types/models'
import type { MealPlanItemWithDetails, MealSlot } from '../types/models'
import { analyseIngredientReuse, singleUseIngredients } from '../lib/reuse'

export function WeeklyPlan() {
  const [weekOf, setWeekOf] = useState(weekStart())
  const [assignTarget, setAssignTarget] = useState<{ day: number; slot: MealSlot } | null>(null)
  const [optimiseOpen, setOptimiseOpen] = useState(false)
  const { data: plan } = useMealPlan(weekOf)
  const updateItem = useUpdatePlanItem()
  const deleteItem = useDeletePlanItem()
  const duplicateItem = useDuplicatePlanItem()

  const items = plan?.items ?? []
  const usage = analyseIngredientReuse(items)
  const singleUse = singleUseIngredients(usage)

  function itemsFor(day: number, slot: MealSlot) {
    return items.filter((i) => i.day_of_week === day && i.meal_slot === slot)
  }

  function handleDrop(day: number, slot: MealSlot, e: React.DragEvent) {
    e.preventDefault()
    const itemId = e.dataTransfer.getData('text/plain')
    if (!itemId) return
    const item = items.find((i) => i.id === itemId)
    if (!item || item.locked) return
    updateItem.mutate({ id: itemId, day_of_week: day, meal_slot: slot })
  }

  return (
    <div>
      <PageHeader
        title="Weekly Plan"
        action={
          <Button onClick={() => setOptimiseOpen(true)}>
            <Sparkles size={16} /> Optimise My Week
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setWeekOf(addDaysToDate(weekOf, -7))} className="rounded-lg p-2 hover:bg-surface-hi">
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-medium">
          Week of {dayLabel(weekOf)} – {dayLabel(addDaysToDate(weekOf, 6))}
        </p>
        <button onClick={() => setWeekOf(addDaysToDate(weekOf, 7))} className="rounded-lg p-2 hover:bg-surface-hi">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[900px] grid-cols-8 gap-2">
          <div />
          {DAYS_OF_WEEK.map((d, i) => (
            <div key={d} className="text-center text-xs font-medium text-text-dim">
              {d.slice(0, 3)} <span className="block text-[10px]">{dayLabel(addDaysToDate(weekOf, i))}</span>
            </div>
          ))}

          {MEAL_SLOTS.map((slot) => (
            <div key={slot} className="contents">
              <div className="flex items-center text-xs font-medium capitalize text-text-dim">{slot}</div>
              {DAYS_OF_WEEK.map((_, day) => (
                <div
                  key={day}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(day, slot, e)}
                  className="min-h-[70px] rounded-lg border border-dashed border-border p-1.5"
                >
                  <div className="space-y-1">
                    {itemsFor(day, slot).map((item) => (
                      <MealChip
                        key={item.id}
                        item={item}
                        onLockToggle={() => updateItem.mutate({ id: item.id, locked: !item.locked })}
                        onDuplicate={() => duplicateItem.mutate(item)}
                        onDelete={() => deleteItem.mutate(item.id)}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setAssignTarget({ day, slot })}
                    className="mt-1 flex w-full items-center justify-center rounded-md py-1 text-text-dim hover:bg-surface-hi hover:text-text"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {singleUse.length > 0 && (
        <Card className="mt-5">
          <h2 className="mb-1 text-sm font-semibold text-text-dim">Single-use ingredients this week</h2>
          <p className="text-xs text-text-dim">
            {singleUse.map((u) => u.ingredient.name).join(', ')} — only used in one recipe. Consider swapping for
            something already planned to reduce waste.
          </p>
        </Card>
      )}

      {assignTarget && plan && (
        <AssignMealModal
          open
          onClose={() => setAssignTarget(null)}
          mealPlanId={plan.planId}
          dayOfWeek={assignTarget.day}
          mealSlot={assignTarget.slot}
        />
      )}

      {plan && <OptimiseModal open={optimiseOpen} onClose={() => setOptimiseOpen(false)} mealPlanId={plan.planId} items={items} />}
    </div>
  )
}

function MealChip({
  item,
  onLockToggle,
  onDuplicate,
  onDelete,
}: {
  item: MealPlanItemWithDetails
  onLockToggle: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const label = item.recipe?.name ?? item.takeaway?.meal ?? item.free_text ?? 'Meal'
  return (
    <div
      draggable={!item.locked}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
      className={`group rounded-md px-2 py-1 text-xs ${item.is_takeaway ? 'bg-warn/15 text-warn' : 'bg-surface-hi text-text'}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate">{label}</span>
        <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
          <button onClick={onDuplicate} title="Duplicate">
            <Copy size={11} />
          </button>
          <button onClick={onLockToggle} title={item.locked ? 'Unlock' : 'Lock'}>
            {item.locked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
          <button onClick={onDelete} title="Remove" className="hover:text-danger">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {item.servings !== 1 && <span className="text-[10px] text-text-dim">{item.servings}× servings</span>}
    </div>
  )
}
