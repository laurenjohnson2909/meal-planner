import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, PageHeader, ProgressBar } from '../components/ui/Primitives'
import { useDeleteFoodLogItem, useFoodLog, useAddFoodLogItem } from '../hooks/useFoodLog'
import { useMealPlan } from '../hooks/useMealPlan'
import { useNutritionTargets } from '../hooks/useProfile'
import { useIngredientUnitConversions } from '../hooks/useIngredients'
import { addDaysToDate, dayOfWeekIndex, dayLabel, todayStr, weekStart } from '../lib/dates'
import { recipePerServing, sumNutrition } from '../lib/nutrition'
import { buildConversionsByIngredient } from '../lib/units'
import { MEAL_SLOTS } from '../types/models'
import { useQuickAdd } from '../hooks/useQuickAdd'

export function FoodLog() {
  const [date, setDate] = useState(todayStr())
  const { data: log } = useFoodLog(date)
  const { data: targets } = useNutritionTargets()
  const { data: plan } = useMealPlan(weekStart(new Date(date)))
  const { data: allConversions } = useIngredientUnitConversions()
  const conversions = buildConversionsByIngredient(allConversions ?? [])
  const deleteItem = useDeleteFoodLogItem()
  const addItem = useAddFoodLogItem()
  const quickAdd = useQuickAdd()

  const items = log?.items ?? []
  const totals = sumNutrition(items)
  const dayIndex = dayOfWeekIndex(new Date(date))
  const plannedToday = (plan?.items ?? []).filter((i) => i.day_of_week === dayIndex)

  async function logAsEaten(planItemId: string) {
    if (!log) return
    const item = plannedToday.find((i) => i.id === planItemId)
    if (!item) return
    if (item.recipe) {
      const perServing = recipePerServing(item.recipe.recipe_ingredients, item.recipe.servings, conversions)
      await addItem.mutateAsync({
        food_log_id: log.logId,
        meal_slot: item.meal_slot,
        source_type: 'recipe',
        source_id: item.recipe.id,
        description: item.recipe.name,
        quantity: item.servings,
        unit: 'serving',
        calories: perServing.calories * item.servings,
        protein_g: perServing.protein_g * item.servings,
        carbs_g: perServing.carbs_g * item.servings,
        fat_g: perServing.fat_g * item.servings,
        fibre_g: perServing.fibre_g * item.servings,
        sugar_g: perServing.sugar_g * item.servings,
        saturated_fat_g: perServing.saturated_fat_g * item.servings,
        salt_g: perServing.salt_g * item.servings,
      })
    } else if (item.takeaway) {
      await addItem.mutateAsync({
        food_log_id: log.logId,
        meal_slot: item.meal_slot,
        source_type: 'takeaway',
        source_id: item.takeaway.id,
        description: item.takeaway.meal,
        quantity: 1,
        unit: 'meal',
        calories: item.takeaway.calories ?? 0,
        protein_g: item.takeaway.protein_g ?? 0,
        carbs_g: item.takeaway.carbs_g ?? 0,
        fat_g: item.takeaway.fat_g ?? 0,
        fibre_g: 0,
        sugar_g: 0,
        saturated_fat_g: 0,
        salt_g: 0,
      })
    }
  }

  return (
    <div>
      <PageHeader
        title="Food Log"
        action={
          <Button onClick={() => quickAdd.open('food')}>
            <Plus size={16} /> Log food
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setDate(addDaysToDate(date, -1))} className="rounded-lg p-2 hover:bg-surface-hi">
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-medium">{dayLabel(date)}{date === todayStr() && ' (today)'}</p>
        <button onClick={() => setDate(addDaysToDate(date, 1))} className="rounded-lg p-2 hover:bg-surface-hi">
          <ChevronRight size={18} />
        </button>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(['calories', 'protein_g', 'carbs_g', 'fat_g'] as const).map((key) => (
            <div key={key}>
              <p className="text-xs capitalize text-text-dim">{key.replace('_g', '')}</p>
              <p className="text-sm font-semibold">
                {Math.round(totals[key])} / {Math.round((targets?.[key] as number) ?? 0)}
              </p>
              <ProgressBar value={totals[key]} max={(targets?.[key] as number) ?? 1} />
            </div>
          ))}
        </div>
      </Card>

      {plannedToday.some((i) => i.recipe || i.takeaway) && (
        <Card className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-text-dim">Planned today — log as eaten?</h2>
          <ul className="space-y-1.5">
            {plannedToday
              .filter((i) => i.recipe || i.takeaway)
              .map((i) => (
                <li key={i.id} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-text-dim">{i.meal_slot}: {i.recipe?.name ?? i.takeaway?.meal}</span>
                  <button onClick={() => logAsEaten(i.id)} className="text-xs text-primary hover:underline">
                    Log as eaten
                  </button>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {MEAL_SLOTS.map((slot) => {
        const slotItems = items.filter((i) => i.meal_slot === slot)
        if (slotItems.length === 0) return null
        return (
          <div key={slot} className="mb-4">
            <h3 className="mb-1.5 text-xs font-semibold capitalize text-text-dim">{slot}</h3>
            <div className="space-y-1.5">
              {slotItems.map((item) => (
                <Card key={item.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm">{item.description ?? item.source_type}</p>
                    <p className="text-xs text-text-dim">
                      {item.quantity}
                      {item.unit} · {Math.round(item.calories)} kcal
                    </p>
                  </div>
                  <button onClick={() => deleteItem.mutate(item.id)} className="text-text-dim hover:text-danger">
                    <Trash2 size={16} />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      {items.length === 0 && <EmptyState title="Nothing logged for this day yet" />}
    </div>
  )
}
