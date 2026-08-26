import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select } from '../components/ui/Primitives'
import { useMealPlan } from '../hooks/useMealPlan'
import { usePantry } from '../hooks/usePantry'
import { useIngredientPrices } from '../hooks/useIngredients'
import { useIngredientCategoryNames } from '../hooks/useIngredientCategories'
import {
  useAddManualShoppingItem,
  useDeleteShoppingItem,
  useRegenerateShoppingList,
  useShoppingList,
  useToggleShoppingItem,
} from '../hooks/useShoppingList'
import { buildShoppingList, consolidateIngredients, groupByCategory } from '../lib/shoppingList'
import { addDaysToDate, dayLabel, weekStart } from '../lib/dates'

export function ShoppingList() {
  const [weekOf, setWeekOf] = useState(weekStart())
  const [manualOpen, setManualOpen] = useState(false)
  const { data: plan } = useMealPlan(weekOf)
  const { data: pantry } = usePantry()
  const { data: list } = useShoppingList(weekOf)
  const { data: prices } = useIngredientPrices()
  const { names: categories } = useIngredientCategoryNames()
  const regenerate = useRegenerateShoppingList()
  const toggle = useToggleShoppingItem()
  const del = useDeleteShoppingItem()
  const addManual = useAddManualShoppingItem()

  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty] = useState(1)
  const [manualUnit, setManualUnit] = useState('g')
  const [manualCategory, setManualCategory] = useState('')

  useEffect(() => {
    if (!manualCategory && categories.length) setManualCategory(categories[0])
  }, [categories, manualCategory])

  async function regenerateFromPlan() {
    if (!plan || !list) return
    const required = consolidateIngredients(plan.items)
    const consolidated = buildShoppingList(required, pantry ?? [])
    await regenerate.mutateAsync({ listId: list.listId, items: consolidated })
  }

  async function submitManual() {
    if (!list || !manualName.trim()) return
    await addManual.mutateAsync({
      shopping_list_id: list.listId,
      name: manualName,
      quantity: manualQty,
      unit: manualUnit,
      category: manualCategory,
    })
    setManualName('')
    setManualQty(1)
    setManualOpen(false)
  }

  const items = list?.items ?? []
  const grouped = groupByCategory(items)
  const uncheckedCount = items.filter((i) => !i.checked).length
  const pricesByIngredient = new Map((prices ?? []).map((p) => [p.ingredient_id, p]))
  const estimatedCost = items.reduce((sum, item) => {
    if (!item.ingredient_id) return sum
    const p = pricesByIngredient.get(item.ingredient_id)
    if (!p || p.quantity <= 0) return sum
    return sum + (p.price / p.quantity) * item.quantity
  }, 0)

  return (
    <div>
      <PageHeader
        title="Shopping List"
        action={
          <Button onClick={() => setManualOpen(true)}>
            <Plus size={16} /> Add item
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

      <Button variant="secondary" className="mb-4 w-full" onClick={regenerateFromPlan} disabled={regenerate.isPending}>
        <RefreshCw size={15} /> Regenerate from weekly plan (pantry stock subtracted)
      </Button>

      {items.length === 0 ? (
        <EmptyState title="Your shopping list is empty" hint="Plan some meals then regenerate, or add items manually." />
      ) : (
        <>
          <p className="mb-2 text-xs text-text-dim">
            {uncheckedCount} item{uncheckedCount === 1 ? '' : 's'} left to buy
            {estimatedCost > 0 && ` · est. £${estimatedCost.toFixed(2)}`}
          </p>
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([category, catItems]) => (
              <div key={category}>
                <h3 className="mb-1.5 text-xs font-semibold text-text-dim">{category}</h3>
                <div className="space-y-1">
                  {catItems.map((item) => (
                    <Card key={item.id} className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => toggle.mutate({ id: item.id, checked: e.target.checked })}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className={`flex-1 text-sm ${item.checked ? 'text-text-dim line-through' : ''}`}>
                        {item.name} — {Math.round(item.quantity * 10) / 10}{item.unit}
                      </span>
                      <button onClick={() => del.mutate(item.id)} className="text-text-dim hover:text-danger">
                        <Trash2 size={15} />
                      </button>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Add item">
        <div className="space-y-3">
          <Field label="Name">
            <Input value={manualName} onChange={(e) => setManualName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <Input type="number" value={manualQty} onChange={(e) => setManualQty(+e.target.value)} />
            </Field>
            <Field label="Unit">
              <Input value={manualUnit} onChange={(e) => setManualUnit(e.target.value)} />
            </Field>
          </div>
          <Field label="Category">
            <Select value={manualCategory} onChange={(e) => setManualCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Button className="w-full" onClick={submitManual} disabled={addManual.isPending}>
            Add to list
          </Button>
        </div>
      </Modal>
    </div>
  )
}
