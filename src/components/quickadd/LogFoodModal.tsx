import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Modal, Button, Field, Input, Select } from '../ui/Primitives'
import { useRecipes } from '../../hooks/useRecipes'
import { useIngredients, useIngredientUnitConversions } from '../../hooks/useIngredients'
import { useFoodLog, useAddFoodLogItem, useRecentFoodLogItems } from '../../hooks/useFoodLog'
import { useTakeaways } from '../../hooks/useTakeaways'
import { ingredientContribution, recipePerServing } from '../../lib/nutrition'
import { buildConversionsByIngredient, RECIPE_UNITS } from '../../lib/units'
import { todayStr } from '../../lib/dates'
import { MEAL_SLOTS, ZERO_NUTRITION, type MealSlot } from '../../types/models'

type Tab = 'recipe' | 'ingredient' | 'takeaway' | 'custom'

export function LogFoodModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('recipe')
  const [date, setDate] = useState(todayStr())
  const [mealSlot, setMealSlot] = useState<MealSlot>('breakfast')

  const { data: recipes } = useRecipes()
  const { data: ingredients } = useIngredients()
  const { data: allConversions } = useIngredientUnitConversions()
  const { data: takeaways } = useTakeaways()
  const { data: log } = useFoodLog(date)
  const { data: recentItems } = useRecentFoodLogItems(30)
  const addItem = useAddFoodLogItem()

  const recentUnique = (() => {
    const seen = new Set<string>()
    const out: typeof recentItems = []
    for (const item of recentItems ?? []) {
      const key = `${item.source_type}:${item.source_id ?? item.description}`
      if (seen.has(key)) continue
      seen.add(key)
      out!.push(item)
      if (out!.length >= 6) break
    }
    return out ?? []
  })()

  async function logRecent(item: NonNullable<typeof recentItems>[number]) {
    if (!log) return
    await addItem.mutateAsync({
      food_log_id: log.logId,
      meal_slot: mealSlot,
      source_type: item.source_type,
      source_id: item.source_id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fibre_g: item.fibre_g,
      sugar_g: item.sugar_g,
      saturated_fat_g: item.saturated_fat_g,
      salt_g: item.salt_g,
    })
    onClose()
  }

  const [recipeId, setRecipeId] = useState('')
  const [servings, setServings] = useState(1)

  const [ingredientId, setIngredientId] = useState('')
  const [ingredientQty, setIngredientQty] = useState(100)
  const [ingredientUnit, setIngredientUnit] = useState('g')

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
    setIngredientQty(100)
    setIngredientUnit('g')
    setTakeawayId('')
    setCustomDesc('')
    setCustomCal(0)
    setCustomProtein(0)
    setCustomCarbs(0)
    setCustomFat(0)
  }

  const conversions = buildConversionsByIngredient(allConversions ?? [])
  const selectedIngredient = ingredients?.find((i) => i.id === ingredientId)
  const ingredientPreview = selectedIngredient
    ? ingredientContribution(selectedIngredient, ingredientQty, ingredientUnit, conversions.get(selectedIngredient.id))
    : null

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
      if (!selectedIngredient || !ingredientPreview) return
      await addItem.mutateAsync({
        ...base,
        source_type: 'ingredient',
        source_id: selectedIngredient.id,
        description: selectedIngredient.name,
        quantity: ingredientQty,
        unit: ingredientUnit,
        ...ingredientPreview,
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

        {recentUnique.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-text-dim">Recent — tap to log again</p>
            <div className="flex flex-wrap gap-1.5">
              {recentUnique.map((item) => (
                <button
                  key={item.id}
                  onClick={() => logRecent(item)}
                  className="rounded-full bg-surface-hi px-2.5 py-1 text-xs text-text hover:bg-border"
                  disabled={addItem.isPending}
                >
                  {item.description ?? item.source_type} · {Math.round(item.calories)} kcal
                </button>
              ))}
            </div>
          </div>
        )}

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
              <Select
                value={ingredientId}
                onChange={(e) => {
                  setIngredientId(e.target.value)
                  const ing = ingredients?.find((i) => i.id === e.target.value)
                  if (ing) setIngredientUnit(ing.nutrition_basis_unit)
                }}
              >
                <option value="">Select an ingredient…</option>
                {ingredients?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
              {selectedIngredient && (
                <p className="mt-1 text-xs text-text-dim">
                  {selectedIngredient.calories} kcal / {selectedIngredient.nutrition_basis_amount}
                  {selectedIngredient.nutrition_basis_unit}
                </p>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity">
                <Input type="number" value={ingredientQty} onChange={(e) => setIngredientQty(+e.target.value)} />
              </Field>
              <Field label="Unit">
                <Select value={ingredientUnit} onChange={(e) => setIngredientUnit(e.target.value)}>
                  {RECIPE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {selectedIngredient &&
              (ingredientPreview ? (
                <p className="text-sm text-primary">{Math.round(ingredientPreview.calories)} kcal</p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-warn">
                  <TriangleAlert size={13} /> Can't calculate "{ingredientUnit}" for this ingredient — add a
                  conversion on the Ingredients page.
                </p>
              ))}
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

        <Button
          className="w-full"
          onClick={submit}
          disabled={addItem.isPending || (tab === 'ingredient' && !!selectedIngredient && !ingredientPreview)}
        >
          Log it
        </Button>
      </div>
    </Modal>
  )
}
