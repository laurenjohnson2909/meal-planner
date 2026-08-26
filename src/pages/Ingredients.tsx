import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { PageHeader, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from '../components/ui/Primitives'
import {
  useDeleteIngredient,
  useIngredientPrices,
  useIngredients,
  useIngredientUnitConversions,
  useSaveIngredient,
  useSaveIngredientPrice,
  useSaveIngredientUnitConversions,
} from '../hooks/useIngredients'
import { useIngredientCategoryNames } from '../hooks/useIngredientCategories'
import { CONVERSION_TARGET_UNITS, NUTRITION_BASIS_UNITS, PACK_SIZE_UNITS, unitFamily } from '../lib/units'
import type { Ingredient } from '../types/models'

const BLANK: Partial<Ingredient> = {
  name: '',
  brand: '',
  category: '',
  nutrition_basis_amount: 100,
  nutrition_basis_unit: 'g',
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fibre_g: 0,
  sugar_g: 0,
  saturated_fat_g: 0,
  salt_g: 0,
  reference_weight_g: null,
}

interface ConversionRow {
  unit: string
  equivalent_amount: number
  equivalent_unit: 'g' | 'ml'
}

export function Ingredients() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Partial<Ingredient> | null>(null)
  const [packPrice, setPackPrice] = useState<number | ''>('')
  const [packSize, setPackSize] = useState(1)
  const [packSizeUnit, setPackSizeUnit] = useState('g')
  const [conversions, setConversions] = useState<ConversionRow[]>([])

  const { data: ingredients, isLoading } = useIngredients(search)
  const { data: prices } = useIngredientPrices()
  const { data: allConversions } = useIngredientUnitConversions()
  const { names: categories } = useIngredientCategoryNames()
  const save = useSaveIngredient()
  const savePrice = useSaveIngredientPrice()
  const saveConversions = useSaveIngredientUnitConversions()
  const del = useDeleteIngredient()

  useEffect(() => {
    if (!editing?.id) {
      setPackPrice('')
      setPackSize(1)
      setPackSizeUnit(editing?.nutrition_basis_unit ?? 'g')
      setConversions([])
      return
    }
    const existingPrice = prices?.find((p) => p.ingredient_id === editing.id)
    setPackPrice(existingPrice?.pack_price ?? '')
    setPackSize(existingPrice?.pack_size ?? 1)
    setPackSizeUnit(existingPrice?.pack_size_unit ?? editing.nutrition_basis_unit ?? 'g')
    const existingConversions = (allConversions ?? []).filter((c) => c.ingredient_id === editing.id)
    setConversions(existingConversions.map((c) => ({ unit: c.unit, equivalent_amount: c.equivalent_amount, equivalent_unit: c.equivalent_unit })))
  }, [editing, prices, allConversions])

  async function submit() {
    if (!editing?.name) return
    const id = await save.mutateAsync(editing)
    if (packPrice !== '') {
      await savePrice.mutateAsync({ ingredient_id: id, pack_price: packPrice, pack_size: packSize, pack_size_unit: packSizeUnit })
    }
    await saveConversions.mutateAsync({ ingredientId: id, conversions })
    setEditing(null)
  }

  function priceFor(ingredientId: string) {
    return prices?.find((p) => p.ingredient_id === ingredientId)
  }

  const basisIsItemLike = editing ? unitFamily(editing.nutrition_basis_unit ?? 'g') === 'other' : false

  return (
    <div>
      <PageHeader
        title="Ingredients"
        action={
          <Button onClick={() => setEditing({ ...BLANK, category: categories[0] ?? '' })}>
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
          {ingredients.map((ing) => {
            const price = priceFor(ing.id)
            return (
              <Card key={ing.id} className="cursor-pointer">
                <div className="flex items-start justify-between">
                  <div onClick={() => setEditing(ing)} className="flex-1">
                    <p className="font-medium">{ing.name}</p>
                    {ing.brand && <p className="text-xs text-text-dim">{ing.brand}</p>}
                    <p className="mt-1 text-xs text-text-dim">
                      {ing.calories} kcal · {ing.protein_g}g protein / {ing.nutrition_basis_amount}
                      {ing.nutrition_basis_unit}
                    </p>
                    {price && (
                      <p className="text-xs text-text-dim">
                        £{price.pack_price.toFixed(2)} / {price.pack_size}
                        {price.pack_size_unit}
                      </p>
                    )}
                  </div>
                  <button onClick={() => del.mutate(ing.id)} className="text-text-dim hover:text-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Ingredient' : 'Add Ingredient'}>
        {editing && (
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">Basic information</p>
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
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">Nutrition information</p>
              <div className="flex items-end gap-2">
                <span className="pb-2 text-sm text-text-dim">Per</span>
                <Input
                  type="number"
                  className="w-20"
                  value={editing.nutrition_basis_amount ?? 100}
                  onChange={(e) => setEditing({ ...editing, nutrition_basis_amount: +e.target.value })}
                />
                <Select
                  className="w-28"
                  value={editing.nutrition_basis_unit ?? 'g'}
                  onChange={(e) => setEditing({ ...editing, nutrition_basis_unit: e.target.value })}
                >
                  {NUTRITION_BASIS_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <NumberField label="Cal" value={editing.calories} onChange={(v) => setEditing({ ...editing, calories: v })} />
                <NumberField label="Protein" value={editing.protein_g} onChange={(v) => setEditing({ ...editing, protein_g: v })} />
                <NumberField label="Carbs" value={editing.carbs_g} onChange={(v) => setEditing({ ...editing, carbs_g: v })} />
                <NumberField label="Fat" value={editing.fat_g} onChange={(v) => setEditing({ ...editing, fat_g: v })} />
                <NumberField label="Fibre" value={editing.fibre_g} onChange={(v) => setEditing({ ...editing, fibre_g: v })} />
                <NumberField label="Sugar" value={editing.sugar_g} onChange={(v) => setEditing({ ...editing, sugar_g: v })} />
                <NumberField label="Sat. fat" value={editing.saturated_fat_g} onChange={(v) => setEditing({ ...editing, saturated_fat_g: v })} />
                <NumberField label="Salt" value={editing.salt_g} onChange={(v) => setEditing({ ...editing, salt_g: v })} />
              </div>
              {basisIsItemLike && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-dim">Optional: 1 {editing.nutrition_basis_unit} ≈</span>
                  <Input
                    type="number"
                    className="w-20"
                    value={editing.reference_weight_g ?? ''}
                    onChange={(e) => setEditing({ ...editing, reference_weight_g: e.target.value === '' ? null : +e.target.value })}
                  />
                  <span className="text-xs text-text-dim">g — lets recipes measure this by weight too</span>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">Shopping information — optional</p>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Pack size">
                  <Input type="number" value={packSize} onChange={(e) => setPackSize(+e.target.value)} />
                </Field>
                <Field label="Pack size unit">
                  <Select value={packSizeUnit} onChange={(e) => setPackSizeUnit(e.target.value)}>
                    {PACK_SIZE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Pack price (£)">
                  <Input type="number" step="0.01" value={packPrice} onChange={(e) => setPackPrice(e.target.value === '' ? '' : +e.target.value)} />
                </Field>
              </div>

              <ConversionsEditor conversions={conversions} setConversions={setConversions} />
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

function ConversionsEditor({
  conversions,
  setConversions,
}: {
  conversions: ConversionRow[]
  setConversions: (rows: ConversionRow[]) => void
}) {
  function update(i: number, patch: Partial<ConversionRow>) {
    setConversions(conversions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }
  function remove(i: number) {
    setConversions(conversions.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs text-text-dim">
          Custom conversions — for recipe units that can't be safely assumed (e.g. "1 tbsp = 15g")
        </p>
        <button
          onClick={() => setConversions([...conversions, { unit: 'tbsp', equivalent_amount: 15, equivalent_unit: 'g' }])}
          className="shrink-0 text-xs text-primary hover:underline"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {conversions.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span>1</span>
            <Input className="w-20" value={c.unit} onChange={(e) => update(i, { unit: e.target.value })} />
            <span>=</span>
            <Input
              type="number"
              className="w-20"
              value={c.equivalent_amount}
              onChange={(e) => update(i, { equivalent_amount: +e.target.value })}
            />
            <Select
              className="w-20"
              value={c.equivalent_unit}
              onChange={(e) => update(i, { equivalent_unit: e.target.value as 'g' | 'ml' })}
            >
              {CONVERSION_TARGET_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
            <button onClick={() => remove(i)} className="text-text-dim hover:text-danger">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
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
