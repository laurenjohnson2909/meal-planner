import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Star, Trash2, X } from 'lucide-react'
import { PageHeader, Button, Card, Field, Input, Select, Textarea, Spinner } from '../components/ui/Primitives'
import { useDeleteRecipe, useRecipe, useSaveRecipe, useToggleFavourite, type RecipeIngredientInput } from '../hooks/useRecipes'
import { useIngredientPrices, useIngredients } from '../hooks/useIngredients'
import { recipeCostPerServing, recipeCostTotal, recipePerServing, recipeTotals } from '../lib/nutrition'
import { RECIPE_TAGS } from '../types/models'
import type { MealType } from '../types/models'

export function RecipeDetail() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { data: recipe, isLoading } = useRecipe(id)
  const { data: allIngredients } = useIngredients()
  const { data: prices } = useIngredientPrices()
  const save = useSaveRecipe()
  const del = useDeleteRecipe()
  const toggleFav = useToggleFavourite()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState<MealType>('dinner')
  const [category, setCategory] = useState('')
  const [servings, setServings] = useState(4)
  const [prepTime, setPrepTime] = useState<number | ''>('')
  const [cookTime, setCookTime] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [instructions, setInstructions] = useState<string[]>([''])
  const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [editing, setEditing] = useState(isNew)
  const [scaleTo, setScaleTo] = useState(4)

  useEffect(() => {
    if (!recipe) return
    setName(recipe.name)
    setDescription(recipe.description ?? '')
    setMealType(recipe.meal_type ?? 'dinner')
    setCategory(recipe.category ?? '')
    setServings(recipe.servings)
    setPrepTime(recipe.prep_time_min ?? '')
    setCookTime(recipe.cook_time_min ?? '')
    setNotes(recipe.notes ?? '')
    setImageUrl(recipe.image_url ?? '')
    setInstructions(recipe.instructions.length ? recipe.instructions : [''])
    setIngredients(recipe.recipe_ingredients.map((ri) => ({ ingredient_id: ri.ingredient_id, quantity: ri.quantity, unit: ri.unit })))
    setTags(recipe.recipe_tags.map((t) => t.tag))
    setScaleTo(recipe.servings)
  }, [recipe])

  if (!isNew && isLoading) return <Spinner />

  const ingredientLines = ingredients
    .map((ri) => {
      const ingredient = allIngredients?.find((i) => i.id === ri.ingredient_id)
      return ingredient ? { ...ri, ingredient } : null
    })
    .filter((x): x is RecipeIngredientInput & { ingredient: NonNullable<typeof allIngredients>[number] } => !!x)

  const totals = recipeTotals(ingredientLines)
  const perServing = recipePerServing(ingredientLines, servings || 1)
  const pricesByIngredient = new Map((prices ?? []).map((p) => [p.ingredient_id, { price: p.price, quantity: p.quantity }]))
  const totalCost = recipeCostTotal(ingredientLines, pricesByIngredient)
  const costPerServing = recipeCostPerServing(totalCost, servings || 1)

  function addIngredientRow() {
    if (!allIngredients?.length) return
    setIngredients([...ingredients, { ingredient_id: allIngredients[0].id, quantity: 100, unit: 'g' }])
  }

  function updateIngredientRow(i: number, patch: Partial<RecipeIngredientInput>) {
    setIngredients(ingredients.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }

  function removeIngredientRow(i: number) {
    setIngredients(ingredients.filter((_, idx) => idx !== i))
  }

  function toggleTag(tag: string) {
    setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag])
  }

  async function submit() {
    if (!name.trim()) return
    const newId = await save.mutateAsync({
      id: recipe?.id,
      name,
      description: description || null,
      meal_type: mealType,
      category: category || null,
      servings,
      prep_time_min: prepTime === '' ? null : prepTime,
      cook_time_min: cookTime === '' ? null : cookTime,
      notes: notes || null,
      image_url: imageUrl || null,
      instructions: instructions.filter((s) => s.trim()),
      is_favourite: recipe?.is_favourite ?? false,
      ingredients,
      tags,
    })
    setEditing(false)
    if (isNew) navigate(`/recipes/${newId}`, { replace: true })
  }

  async function handleDelete() {
    if (!recipe) return
    if (!confirm(`Delete "${recipe.name}"? This can't be undone.`)) return
    await del.mutateAsync(recipe.id)
    navigate('/recipes')
  }

  const viewMode = !editing && !isNew

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={isNew ? 'New Recipe' : viewMode ? recipe?.name ?? '' : `Edit ${recipe?.name ?? ''}`}
        action={
          viewMode ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => recipe && toggleFav.mutate({ id: recipe.id, is_favourite: !recipe.is_favourite })}
              >
                <Star size={16} fill={recipe?.is_favourite ? 'currentColor' : 'none'} />
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={16} />
              </Button>
            </div>
          ) : undefined
        }
      />

      {viewMode && recipe ? (
        <div className="space-y-4">
          {recipe.description && <p className="text-sm text-text-dim">{recipe.description}</p>}
          <div className="flex flex-wrap gap-2 text-xs text-text-dim">
            <span className="capitalize">{recipe.meal_type}</span>
            {recipe.category && <span>· {recipe.category}</span>}
            <span>· {recipe.servings} servings</span>
            {recipe.prep_time_min != null && <span>· {recipe.prep_time_min}m prep</span>}
            {recipe.cook_time_min != null && <span>· {recipe.cook_time_min}m cook</span>}
          </div>
          {recipe.recipe_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.recipe_tags.map((t) => (
                <span key={t.id} className="rounded-full bg-surface-hi px-2 py-0.5 text-xs text-text-dim">
                  {t.tag}
                </span>
              ))}
            </div>
          )}

          <Card>
            <h2 className="mb-2 text-sm font-semibold text-text-dim">Nutrition per serving</h2>
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div>{Math.round(perServing.calories)} kcal</div>
              <div>{Math.round(perServing.protein_g)}g protein</div>
              <div>{Math.round(perServing.carbs_g)}g carbs</div>
              <div>{Math.round(perServing.fat_g)}g fat</div>
            </div>
            <p className="mt-2 text-xs text-text-dim">
              Recipe total: {Math.round(totals.calories)} kcal · {Math.round(totals.protein_g)}g protein
            </p>
            {totalCost > 0 && (
              <p className="mt-1 text-xs text-text-dim">
                Est. cost: £{totalCost.toFixed(2)} total · £{costPerServing.toFixed(2)} / serving
              </p>
            )}
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-dim">Ingredients</h2>
              <div className="flex items-center gap-1.5 text-xs text-text-dim">
                Scale to
                <Input
                  type="number"
                  min={1}
                  value={scaleTo}
                  onChange={(e) => setScaleTo(+e.target.value)}
                  className="w-14 py-1 text-center"
                />
                servings
              </div>
            </div>
            <ul className="space-y-1 text-sm">
              {recipe.recipe_ingredients.map((ri) => {
                const factor = scaleTo / Math.max(recipe.servings, 1e-9)
                const scaledQty = Math.round(ri.quantity * factor * 10) / 10
                return (
                  <li key={ri.id}>
                    {scaledQty}
                    {ri.unit} {ri.ingredient.name}
                  </li>
                )
              })}
            </ul>
            {scaleTo !== recipe.servings && (
              <p className="mt-2 text-xs text-text-dim">Scaled from the original {recipe.servings} servings.</p>
            )}
          </Card>

          {recipe.instructions.length > 0 && (
            <Card>
              <h2 className="mb-2 text-sm font-semibold text-text-dim">Instructions</h2>
              <ol className="list-decimal space-y-1.5 pl-4 text-sm">
                {recipe.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Card>
          )}

          {recipe.notes && (
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-text-dim">Notes</h2>
              <p className="text-sm">{recipe.notes}</p>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Meal type">
              <Select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Category/cuisine">
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </Field>
            <Field label="Servings">
              <Input type="number" min={1} value={servings} onChange={(e) => setServings(+e.target.value)} />
            </Field>
            <Field label="Prep (min)">
              <Input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value === '' ? '' : +e.target.value)} />
            </Field>
            <Field label="Cook (min)">
              <Input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value === '' ? '' : +e.target.value)} />
            </Field>
          </div>
          <Field label="Image URL (optional)">
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          </Field>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-text-dim">Ingredients</p>
              <button onClick={addIngredientRow} className="text-xs text-primary hover:underline">
                + Add ingredient
              </button>
            </div>
            <div className="space-y-2">
              {ingredients.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <Select className="flex-1" value={row.ingredient_id} onChange={(e) => updateIngredientRow(i, { ingredient_id: e.target.value })}>
                    {allIngredients?.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    className="w-20"
                    value={row.quantity}
                    onChange={(e) => updateIngredientRow(i, { quantity: +e.target.value })}
                  />
                  <Input
                    className="w-16"
                    value={row.unit}
                    onChange={(e) => updateIngredientRow(i, { unit: e.target.value })}
                  />
                  <button onClick={() => removeIngredientRow(i)} className="text-text-dim hover:text-danger">
                    <X size={16} />
                  </button>
                </div>
              ))}
              {ingredients.length === 0 && <p className="text-xs text-text-dim">No ingredients added yet.</p>}
            </div>
            {ingredients.length > 0 && (
              <p className="mt-2 text-xs text-text-dim">
                Per serving: {Math.round(perServing.calories)} kcal · {Math.round(perServing.protein_g)}g protein
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-text-dim">Instructions</p>
              <button onClick={() => setInstructions([...instructions, ''])} className="text-xs text-primary hover:underline">
                + Add step
              </button>
            </div>
            <div className="space-y-2">
              {instructions.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="pt-2 text-xs text-text-dim">{i + 1}.</span>
                  <Textarea
                    rows={1}
                    className="flex-1"
                    value={step}
                    onChange={(e) => setInstructions(instructions.map((s, idx) => (idx === i ? e.target.value : s)))}
                  />
                  <button
                    onClick={() => setInstructions(instructions.filter((_, idx) => idx !== i))}
                    className="text-text-dim hover:text-danger"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Field label="Notes">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div>
            <p className="mb-1 text-xs font-medium text-text-dim">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {RECIPE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    tags.includes(tag) ? 'bg-primary text-slate-900' : 'bg-surface-hi text-text-dim'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={submit} disabled={save.isPending}>
              Save recipe
            </Button>
            {!isNew && (
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
