import { useEffect, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from '../components/ui/Primitives'
import { useDeleteIngredient, useIngredientPrices, useIngredients, useSaveIngredient, useSaveIngredientPrice } from '../hooks/useIngredients'
import type { Ingredient } from '../types/models'
import { INGREDIENT_CATEGORIES } from '../types/models'

const BLANK: Partial<Ingredient> = {
  name: '',
  brand: '',
  category: INGREDIENT_CATEGORIES[0],
  calories_per_100g: 0,
  protein_per_100g: 0,
  carbs_per_100g: 0,
  fat_per_100g: 0,
  fibre_per_100g: 0,
  sugar_per_100g: 0,
  saturated_fat_per_100g: 0,
  salt_per_100g: 0,
  default_unit: 'g',
}

export function Ingredients() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Partial<Ingredient> | null>(null)
  const [price, setPrice] = useState<number | ''>('')
  const [priceQty, setPriceQty] = useState(1)
  const [priceUnit, setPriceUnit] = useState('g')
  const { data: ingredients, isLoading } = useIngredients(search)
  const { data: prices } = useIngredientPrices()
  const save = useSaveIngredient()
  const savePrice = useSaveIngredientPrice()
  const del = useDeleteIngredient()

  useEffect(() => {
    if (!editing?.id) {
      setPrice('')
      setPriceQty(1)
      setPriceUnit(editing?.default_unit ?? 'g')
      return
    }
    const existing = prices?.find((p) => p.ingredient_id === editing.id)
    setPrice(existing?.price ?? '')
    setPriceQty(existing?.quantity ?? 1)
    setPriceUnit(existing?.unit ?? editing.default_unit ?? 'g')
  }, [editing, prices])

  async function submit() {
    if (!editing?.name) return
    const id = await save.mutateAsync(editing)
    if (price !== '') {
      await savePrice.mutateAsync({ ingredient_id: id, price, quantity: priceQty, unit: priceUnit })
    }
    setEditing(null)
  }

  function priceFor(ingredientId: string) {
    return prices?.find((p) => p.ingredient_id === ingredientId)
  }

  return (
    <div>
      <PageHeader
        title="Ingredients"
        action={
          <Button onClick={() => setEditing(BLANK)}>
            <Plus size={16} /> Add
          </Button>
        }
      />

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <Input className="pl-9" placeholder="Search ingredients…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <Spinner />
      ) : !ingredients?.length ? (
        <EmptyState title="No ingredients yet" hint="Add your first ingredient, including own-brand foods like Aldi or ASDA products." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {ingredients.map((ing) => (
            <Card key={ing.id} className="cursor-pointer" >
              <div className="flex items-start justify-between">
                <div onClick={() => setEditing(ing)} className="flex-1">
                  <p className="font-medium">{ing.name}</p>
                  {ing.brand && <p className="text-xs text-text-dim">{ing.brand}</p>}
                  <p className="mt-1 text-xs text-text-dim">
                    {ing.calories_per_100g} kcal · {ing.protein_per_100g}g protein / 100g
                  </p>
                  {priceFor(ing.id) && (
                    <p className="text-xs text-text-dim">
                      £{priceFor(ing.id)!.price.toFixed(2)} / {priceFor(ing.id)!.quantity}{priceFor(ing.id)!.unit}
                    </p>
                  )}
                </div>
                <button onClick={() => del.mutate(ing.id)} className="text-text-dim hover:text-danger">
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Ingredient' : 'Add Ingredient'}>
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <Field label="Brand (optional)">
                <Input value={editing.brand ?? ''} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} />
              </Field>
            </div>
            <Field label="Category">
              <Select value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {INGREDIENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-xs text-text-dim">Nutrition per 100g</p>
            <div className="grid grid-cols-4 gap-2">
              <NumberField label="Cal" value={editing.calories_per_100g} onChange={(v) => setEditing({ ...editing, calories_per_100g: v })} />
              <NumberField label="Protein" value={editing.protein_per_100g} onChange={(v) => setEditing({ ...editing, protein_per_100g: v })} />
              <NumberField label="Carbs" value={editing.carbs_per_100g} onChange={(v) => setEditing({ ...editing, carbs_per_100g: v })} />
              <NumberField label="Fat" value={editing.fat_per_100g} onChange={(v) => setEditing({ ...editing, fat_per_100g: v })} />
              <NumberField label="Fibre" value={editing.fibre_per_100g} onChange={(v) => setEditing({ ...editing, fibre_per_100g: v })} />
              <NumberField label="Sugar" value={editing.sugar_per_100g} onChange={(v) => setEditing({ ...editing, sugar_per_100g: v })} />
              <NumberField label="Sat. fat" value={editing.saturated_fat_per_100g} onChange={(v) => setEditing({ ...editing, saturated_fat_per_100g: v })} />
              <NumberField label="Salt" value={editing.salt_per_100g} onChange={(v) => setEditing({ ...editing, salt_per_100g: v })} />
            </div>
            <p className="text-xs text-text-dim">Price (optional — powers cost tracking &amp; "lowest cost" optimising)</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Price (£)">
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : +e.target.value)} />
              </Field>
              <Field label="For quantity">
                <Input type="number" value={priceQty} onChange={(e) => setPriceQty(+e.target.value)} />
              </Field>
              <Field label="Unit">
                <Input value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} />
              </Field>
            </div>
            <Button className="w-full" onClick={submit} disabled={save.isPending}>
              Save ingredient
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" step="0.1" value={value ?? 0} onChange={(e) => onChange(+e.target.value)} />
    </Field>
  )
}
