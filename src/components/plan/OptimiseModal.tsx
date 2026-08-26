import { useState } from 'react'
import { Modal, Button, Field, Select } from '../ui/Primitives'
import { optimiseWeek, type OptimiseSlot } from '../../lib/optimizer'
import { useRecipes } from '../../hooks/useRecipes'
import { useIngredientPrices, useIngredientUnitConversions } from '../../hooks/useIngredients'
import { buildConversionsByIngredient } from '../../lib/units'
import { useNutritionTargets } from '../../hooks/useProfile'
import { useAddPlanItem, useUpdatePlanItem, type MealPlanItemInput } from '../../hooks/useMealPlan'
import type { MealPlanItemWithDetails, MealSlot, OptimisePriority } from '../../types/models'
import { MEAL_SLOTS } from '../../types/models'

const PRIORITIES: { value: OptimisePriority; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'lowest_cost', label: 'Lowest cost' },
  { value: 'lowest_waste', label: 'Lowest food waste' },
  { value: 'highest_protein', label: 'Highest protein' },
  { value: 'lowest_calories', label: 'Lowest calories' },
  { value: 'most_variety', label: 'Most variety' },
]

export function OptimiseModal({
  open,
  onClose,
  mealPlanId,
  items,
}: {
  open: boolean
  onClose: () => void
  mealPlanId: string
  items: MealPlanItemWithDetails[]
}) {
  const [priority, setPriority] = useState<OptimisePriority>('balanced')
  const [applying, setApplying] = useState(false)
  const { data: recipes } = useRecipes()
  const { data: prices } = useIngredientPrices()
  const { data: allConversions } = useIngredientUnitConversions()
  const { data: targets } = useNutritionTargets()
  const addItem = useAddPlanItem()
  const updateItem = useUpdatePlanItem()

  async function apply() {
    if (!recipes) return
    setApplying(true)
    try {
      const slots: OptimiseSlot[] = []
      for (let day = 0; day < 7; day++) {
        for (const mealSlot of MEAL_SLOTS) {
          const existing = items.find((i) => i.day_of_week === day && i.meal_slot === mealSlot)
          slots.push({
            key: `${day}-${mealSlot}`,
            dayOfWeek: day,
            mealSlot,
            locked: existing?.locked ?? false,
            lockedRecipeId: existing?.locked ? existing.recipe_id : undefined,
          })
        }
      }

      const packsByIngredient = new Map((prices ?? []).map((p) => [p.ingredient_id, p]))
      const conversions = buildConversionsByIngredient(allConversions ?? [])

      const result = optimiseWeek({
        slots,
        recipes,
        priority,
        dailyCalorieTarget: targets?.calories ?? 2000,
        dailyProteinTarget: targets?.protein_g ?? 120,
        packsByIngredient,
        conversions,
      })

      for (const slot of slots) {
        if (slot.locked) continue
        const recipeId = result.assignments.get(slot.key)
        if (!recipeId) continue
        const existing = items.find((i) => i.day_of_week === slot.dayOfWeek && i.meal_slot === slot.mealSlot)
        if (existing) {
          await updateItem.mutateAsync({ id: existing.id, recipe_id: recipeId, takeaway_id: null, free_text: null, is_takeaway: false })
        } else {
          const input: MealPlanItemInput = {
            meal_plan_id: mealPlanId,
            day_of_week: slot.dayOfWeek,
            meal_slot: slot.mealSlot as MealSlot,
            recipe_id: recipeId,
            servings: 1,
          }
          await addItem.mutateAsync(input)
        }
      }
      onClose()
    } finally {
      setApplying(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Optimise My Week">
      <div className="space-y-4">
        <p className="text-xs text-text-dim">
          Fills every unlocked slot with recipes from your library. Locked meals are left untouched, and the same
          recipe is capped at 2 uses per week.
        </p>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as OptimisePriority)}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button className="w-full" onClick={apply} disabled={applying || !recipes?.length}>
          {applying ? 'Optimising…' : 'Optimise unlocked meals'}
        </Button>
        {!recipes?.length && <p className="text-xs text-warn">Add some recipes first so there's something to plan with.</p>}
      </div>
    </Modal>
  )
}
