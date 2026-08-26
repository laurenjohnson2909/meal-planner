import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Badge } from '../components/ui/Primitives'
import { IngredientPicker } from '../components/ui/IngredientPicker'
import { useDeletePantryItem, usePantry, useSavePantryItem } from '../hooks/usePantry'
import { useIngredients } from '../hooks/useIngredients'
import { useAddLeftover, useDeleteLeftover, useLeftovers, useUpdateLeftover } from '../hooks/useLeftovers'
import { useRecipes } from '../hooks/useRecipes'
import { RECIPE_UNITS } from '../lib/units'
import { todayStr } from '../lib/dates'

export function Pantry() {
  const { data: pantry } = usePantry()
  const { data: ingredients } = useIngredients()
  const save = useSavePantryItem()
  const del = useDeletePantryItem()
  const [open, setOpen] = useState(false)

  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [unit, setUnit] = useState('g')
  const [useBy, setUseBy] = useState('')

  async function submit() {
    if (!ingredientId) return
    await save.mutateAsync({ ingredient_id: ingredientId, quantity, unit, use_by_date: useBy || null })
    setIngredientId('')
    setQuantity(0)
    setUseBy('')
    setOpen(false)
  }

  function daysUntil(dateStr: string) {
    return Math.round((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
  }

  return (
    <div className="space-y-6">
      <div>
        <PageHeader
          title="Pantry"
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> Add item
            </Button>
          }
        />
        <p className="mb-4 text-xs text-text-dim">
          What you already own — quantities here get subtracted from your weekly shopping list.
        </p>

        {!pantry?.length ? (
          <EmptyState title="Your pantry is empty" hint="Add what you have on hand so the shopping list only shows what you need to buy." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {pantry.map((item) => {
              const days = item.use_by_date ? daysUntil(item.use_by_date) : null
              return (
                <Card key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.ingredient.name}</p>
                    <p className="text-xs text-text-dim">
                      {item.quantity}
                      {item.unit}
                    </p>
                    {days != null && (
                      <Badge tone={days <= 3 ? 'warn' : 'default'}>
                        {days < 0 ? 'expired' : days === 0 ? 'use today' : `use within ${days}d`}
                      </Badge>
                    )}
                  </div>
                  <button onClick={() => del.mutate(item.id)} className="text-text-dim hover:text-danger">
                    <Trash2 size={16} />
                  </button>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <LeftoversSection />

      <Modal open={open} onClose={() => setOpen(false)} title="Add pantry item">
        <div className="space-y-3">
          <Field label="Ingredient">
            <IngredientPicker
              ingredients={ingredients ?? []}
              value={ingredientId}
              onChange={(id) => {
                setIngredientId(id)
                const ing = ingredients?.find((i) => i.id === id)
                if (ing) setUnit(ing.nutrition_basis_unit)
              }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <Input type="number" value={quantity} onChange={(e) => setQuantity(+e.target.value)} />
            </Field>
            <Field label="Unit">
              <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {RECIPE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Use-by date (optional)">
            <Input type="date" value={useBy} onChange={(e) => setUseBy(e.target.value)} />
          </Field>
          <Button className="w-full" onClick={submit} disabled={save.isPending}>
            Add to pantry
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function LeftoversSection() {
  const { data: leftovers } = useLeftovers()
  const { data: recipes } = useRecipes()
  const addLeftover = useAddLeftover()
  const updateLeftover = useUpdateLeftover()
  const delLeftover = useDeleteLeftover()
  const [open, setOpen] = useState(false)

  const [recipeId, setRecipeId] = useState('')
  const [portions, setPortions] = useState(1)
  const [useBy, setUseBy] = useState('')

  async function submit() {
    if (!recipeId) return
    await addLeftover.mutateAsync({ recipe_id: recipeId, portions_remaining: portions, date_cooked: todayStr(), use_by_date: useBy || null })
    setRecipeId('')
    setPortions(1)
    setUseBy('')
    setOpen(false)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Leftovers</h2>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Save leftovers
        </Button>
      </div>
      <p className="mb-4 text-xs text-text-dim">
        Track portions left after cooking, then add them to a future meal slot from the weekly planner.
      </p>

      {!leftovers?.length ? (
        <EmptyState title="No leftovers tracked" hint="After cooking a recipe with extra portions, save them here." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {leftovers.map((l) => (
            <Card key={l.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{l.recipe?.name ?? 'Meal'}</p>
                <p className="text-xs text-text-dim">
                  {l.portions_remaining} portion{l.portions_remaining === 1 ? '' : 's'} left · cooked {l.date_cooked}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateLeftover.mutate({ id: l.id, portions_remaining: Math.max(0, l.portions_remaining - 1) })}
                  className="rounded bg-surface-hi px-2 py-1 text-xs hover:bg-border"
                >
                  −1
                </button>
                <button onClick={() => delLeftover.mutate(l.id)} className="text-text-dim hover:text-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Save leftovers">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Portions remaining">
              <Input type="number" min={1} value={portions} onChange={(e) => setPortions(+e.target.value)} />
            </Field>
            <Field label="Use by (optional)">
              <Input type="date" value={useBy} onChange={(e) => setUseBy(e.target.value)} />
            </Field>
          </div>
          <Button className="w-full" onClick={submit} disabled={addLeftover.isPending}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  )
}
