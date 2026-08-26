import { useState } from 'react'
import { Modal, Button, Field, Input, Select } from '../ui/Primitives'
import { useRecipes } from '../../hooks/useRecipes'
import { useTakeaways } from '../../hooks/useTakeaways'
import { useLeftovers, useUpdateLeftover } from '../../hooks/useLeftovers'
import { useAddPlanItem, type MealPlanItemInput } from '../../hooks/useMealPlan'

type Tab = 'recipe' | 'leftovers' | 'takeaway' | 'custom'

export function AssignMealModal({
  open,
  onClose,
  mealPlanId,
  dayOfWeek,
  mealSlot,
}: {
  open: boolean
  onClose: () => void
  mealPlanId: string
  dayOfWeek: number
  mealSlot: MealPlanItemInput['meal_slot']
}) {
  const [tab, setTab] = useState<Tab>('recipe')
  const [recipeId, setRecipeId] = useState('')
  const [leftoverId, setLeftoverId] = useState('')
  const [takeawayId, setTakeawayId] = useState('')
  const [freeText, setFreeText] = useState('')
  const [servings, setServings] = useState(1)

  const { data: recipes } = useRecipes()
  const { data: takeaways } = useTakeaways()
  const { data: leftovers } = useLeftovers()
  const addItem = useAddPlanItem()
  const updateLeftover = useUpdateLeftover()

  async function submit() {
    const base: MealPlanItemInput = { meal_plan_id: mealPlanId, day_of_week: dayOfWeek, meal_slot: mealSlot, servings }
    if (tab === 'recipe') {
      if (!recipeId) return
      await addItem.mutateAsync({ ...base, recipe_id: recipeId })
    } else if (tab === 'leftovers') {
      const leftover = leftovers?.find((l) => l.id === leftoverId)
      if (!leftover?.recipe_id) return
      await addItem.mutateAsync({ ...base, recipe_id: leftover.recipe_id, servings: Math.min(servings, leftover.portions_remaining) })
      await updateLeftover.mutateAsync({ id: leftover.id, portions_remaining: Math.max(0, leftover.portions_remaining - servings) })
    } else if (tab === 'takeaway') {
      if (!takeawayId) return
      await addItem.mutateAsync({ ...base, takeaway_id: takeawayId, is_takeaway: true })
    } else {
      if (!freeText.trim()) return
      await addItem.mutateAsync({ ...base, free_text: freeText })
    }
    setRecipeId('')
    setLeftoverId('')
    setTakeawayId('')
    setFreeText('')
    setServings(1)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add to plan">
      <div className="space-y-3">
        <div className="flex gap-1 rounded-lg bg-surface-hi p-1 text-xs">
          {(['recipe', 'leftovers', 'takeaway', 'custom'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-1.5 capitalize ${tab === t ? 'bg-primary text-slate-900' : 'text-text-dim'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'recipe' && (
          <div className="space-y-3">
            <Field label="Recipe">
              <Select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
                <option value="">Select a recipe…</option>
                {recipes?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Servings">
              <Input type="number" step="0.25" value={servings} onChange={(e) => setServings(+e.target.value)} />
            </Field>
          </div>
        )}

        {tab === 'leftovers' && (
          <div className="space-y-3">
            {!leftovers?.length ? (
              <p className="text-xs text-text-dim">No leftovers saved yet — save some from the Pantry page after cooking.</p>
            ) : (
              <>
                <Field label="Leftover">
                  <Select value={leftoverId} onChange={(e) => setLeftoverId(e.target.value)}>
                    <option value="">Select saved leftovers…</option>
                    {leftovers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.recipe?.name ?? 'Meal'} ({l.portions_remaining} portions left)
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Portions to use">
                  <Input type="number" step="0.25" value={servings} onChange={(e) => setServings(+e.target.value)} />
                </Field>
              </>
            )}
          </div>
        )}

        {tab === 'takeaway' && (
          <Field label="Takeaway">
            <Select value={takeawayId} onChange={(e) => setTakeawayId(e.target.value)}>
              <option value="">Select a saved takeaway…</option>
              {takeaways?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.restaurant ? `${t.restaurant} — ${t.meal}` : t.meal}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {tab === 'custom' && (
          <Field label="Meal">
            <Input value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="e.g. Eating out…" />
          </Field>
        )}

        <Button className="w-full" onClick={submit} disabled={addItem.isPending}>
          Add to plan
        </Button>
      </div>
    </Modal>
  )
}
