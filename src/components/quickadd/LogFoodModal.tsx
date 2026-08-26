import { useState } from 'react'
import { Modal, Button, Field, Input, Select } from '../ui/Primitives'
import { useRecipes } from '../../hooks/useRecipes'
import { useIngredients } from '../../hooks/useIngredients'
import { useFoodLog, useAddFoodLogItem } from '../../hooks/useFoodLog'
import { useTakeaways } from '../../hooks/useTakeaways'
import { ingredientContribution, recipePerServing } from '../../lib/nutrition'
import { todayStr } from '../../lib/dates'
import { MEAL_SLOTS, ZERO_NUTRITION, type MealSlot } from '../../types/models'

type Tab = 'recipe' | 'ingredient' | 'takeaway' | 'custom'

export function LogFoodModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('recipe')
  const [date, setDate] = useState(todayStr())
  const [mealSlot, setMealSlot] = useState<MealSlot>('breakfast')

  const { data: recipes } = useRecipes()
  const { data: ingredients } = useIngredients()
  const { data: takeaways } = useTakeaways()
  const { data: log } = useFoodLog(date)
  const addItem = useAddFoodLogItem()

  const [recipeId, setRecipeId] = useState('')
  const [servings, setServings] = useState(1)

  const [ingredientId, setIngredientId] = useState('')
  const [grams, setGrams] = useState(100)

  const [takeawayId, setTakeawayId] = useState('')

  const [customDesc, setCustomDesc] = useState('')
  const [customCal, setCustomCal] = useState(0)
  const [customProtein, setCustomProtein] = useState(0)
  const [customCarbs, setCustomCarbs] = useState(0)
  const [customFat, setCustomFat] = useState(0)

  function reset() {
    setRecipeId('')
    setServings(1)
    setIngredientId('')
    setGrams(100)
    setTakeawayId('')
    setCustomDesc('')
    setCustomCal(0)
    setCustomProtein(0)
    setCustomCarbs(0)
    setCustomFat(0)
  }

  async function submit() {
    if (!log) return
    const base = { food_log_id: log.logId, meal_slot: mealSlot }

    if (tab === 'recipe') {
      const recipe = recipes?.find((r) => r.id === recipeId)
      if (!recipe) return
      const perServing = recipePerServing(recipe.recipe_ingredients, recipe.servings)
      await addItem.mutateAsync({
        ...base,
        source_type: 'recipe',
        source_id: recipe.id,
        description: recipe.name,
        quantity: servings,
        unit: 'serving',
        calories: perServing.calories * servings,
        protein_g: perServing.protein_g * servings,
        carbs_g: perServing.carbs_g * servings,
        fat_g: perServing.fat_g * servings,
        fibre_g: perServing.fibre_g * servings,
        sugar_g: perServing.sugar_g * servings,
        saturated_fat_g: perServing.saturated_fat_g * servings,
        salt_g: perServing.salt_g * servings,
      })
    } else if (tab === 'ingredient') {
      const ingredient = ingredients?.find((i) => i.id === ingredientId)
      if (!ingredient) return
      const contribution = ingredientContribution(ingredient, grams)
      await addItem.mutateAsync({
        ...base,
        source_type: 'ingredient',
        source_id: ingredient.id,
        description: ingredient.name,
        quantity: grams,
        unit: 'g',
        ...contribution,
      })
    } else if (tab === 'takeaway') {
      const takeaway = takeaways?.find((t) => t.id === takeawayId)
      if (!takeaway) return
      await addItem.mutateAsync({
        ...base,
        source_type: 'takeaway',
        source_id: takeaway.id,
        description: `${takeaway.restaurant ?? ''} ${takeaway.meal}`.trim(),
        quantity: 1,
        unit: 'meal',
        ...ZERO_NUTRITION,
        calories: takeaway.calories ?? 0,
        protein_g: takeaway.protein_g ?? 0,
        carbs_g: takeaway.carbs_g ?? 0,
        fat_g: takeaway.fat_g ?? 0,
      })
    } else {
      await addItem.mutateAsync({
        ...base,
        source_type: 'custom',
        description: customDesc,
        quantity: 1,
        unit: 'serving',
        ...ZERO_NUTRITION,
        calories: customCal,
        protein_g: customProtein,
        carbs_g: customCarbs,
        fat_g: customFat,
      })
    }
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Food">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Meal">
            <Select value={mealSlot} onChange={(e) => setMealSlot(e.target.value as MealSlot)}>
              {MEAL_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex gap-1 rounded-lg bg-surface-hi p-1 text-xs">
          {(['recipe', 'ingredient', 'takeaway', 'custom'] as Tab[]).map((t) => (
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
            <Field label="Servings eaten">
              <Input type="number" step="0.25" value={servings} onChange={(e) => setServings(+e.target.value)} />
            </Field>
          </div>
        )}

        {tab === 'ingredient' && (
          <div className="space-y-3">
            <Field label="Ingredient">
              <Select value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
                <option value="">Select an ingredient…</option>
                {ingredients?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity (g)">
              <Input type="number" value={grams} onChange={(e) => setGrams(+e.target.value)} />
            </Field>
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
            <p className="mt-1 text-xs text-text-dim">No saved takeaways yet? Use "Add Takeaway" from the Add menu first.</p>
          </Field>
        )}

        {tab === 'custom' && (
          <div className="space-y-3">
            <Field label="Description">
              <Input value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} placeholder="e.g. Packaged sandwich" />
            </Field>
            <div className="grid grid-cols-4 gap-2">
              <Field label="Cal">
                <Input type="number" value={customCal} onChange={(e) => setCustomCal(+e.target.value)} />
              </Field>
              <Field label="Protein">
                <Input type="number" value={customProtein} onChange={(e) => setCustomProtein(+e.target.value)} />
              </Field>
              <Field label="Carbs">
                <Input type="number" value={customCarbs} onChange={(e) => setCustomCarbs(+e.target.value)} />
              </Field>
              <Field label="Fat">
                <Input type="number" value={customFat} onChange={(e) => setCustomFat(+e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        <Button className="w-full" onClick={submit} disabled={addItem.isPending}>
          Log it
        </Button>
      </div>
    </Modal>
  )
}
