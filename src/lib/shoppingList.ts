import type { Ingredient, IngredientPrice, PantryItemWithIngredient } from '../types/models'
import type { PlannedItemForReuse } from './reuse'
import { convertToUnit, formatPackSize, type UnitConversion } from './units'

export interface ConsolidatedItem {
  ingredientId: string
  name: string
  category: string
  requiredQuantity: number
  unit: string
  pantryQuantity: number
  toBuyQuantity: number
}

/**
 * Spec §8: combine quantities for the same ingredient across all recipes in the week.
 * Everything is converted to the ingredient's own nutrition_basis_unit before summing
 * — two recipes using "40g" and "0.5kg" of the same ingredient must add up correctly,
 * not be summed as raw numbers.
 */
export function consolidateIngredients(
  planItems: PlannedItemForReuse[],
  conversions: Map<string, Map<string, UnitConversion>> = new Map(),
): Map<string, { ingredient: Ingredient; quantity: number; unit: string }> {
  const combined = new Map<string, { ingredient: Ingredient; quantity: number; unit: string }>()

  for (const item of planItems) {
    const recipe = item.recipe
    if (!recipe) continue
    const servingFactor = item.servings / Math.max(recipe.servings, 1e-9)

    for (const line of recipe.recipe_ingredients) {
      const canonicalUnit = line.ingredient.nutrition_basis_unit
      const convs = conversions.get(line.ingredient.id) ?? new Map()
      const equivalent = convertToUnit(line.ingredient, line.quantity, line.unit, canonicalUnit, convs)
      if (equivalent === null) continue // unresolvable line — excluded rather than mis-summed

      const qty = equivalent * servingFactor
      const existing = combined.get(line.ingredient.id)
      if (existing) {
        existing.quantity += qty
      } else {
        combined.set(line.ingredient.id, { ingredient: line.ingredient, quantity: qty, unit: canonicalUnit })
      }
    }
  }

  return combined
}

/** Spec §9: subtract what's already in the pantry from what's required (converted to the same unit). */
export function buildShoppingList(
  required: Map<string, { ingredient: Ingredient; quantity: number; unit: string }>,
  pantry: PantryItemWithIngredient[],
  conversions: Map<string, Map<string, UnitConversion>> = new Map(),
): ConsolidatedItem[] {
  const pantryByIngredient = new Map<string, number>()
  for (const p of pantry) {
    const convs = conversions.get(p.ingredient_id) ?? new Map()
    const required_for = required.get(p.ingredient_id)
    const targetUnit = required_for?.unit ?? p.ingredient.nutrition_basis_unit
    const equivalent = convertToUnit(p.ingredient, p.quantity, p.unit, targetUnit, convs)
    if (equivalent === null) continue
    pantryByIngredient.set(p.ingredient_id, (pantryByIngredient.get(p.ingredient_id) ?? 0) + equivalent)
  }

  const items: ConsolidatedItem[] = []
  for (const [ingredientId, req] of required) {
    const pantryQty = pantryByIngredient.get(ingredientId) ?? 0
    const toBuy = Math.max(0, req.quantity - pantryQty)
    items.push({
      ingredientId,
      name: req.ingredient.name,
      category: req.ingredient.category ?? 'Other',
      requiredQuantity: req.quantity,
      unit: req.unit,
      pantryQuantity: pantryQty,
      toBuyQuantity: toBuy,
    })
  }

  return items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
}

export interface PurchaseSuggestion {
  label: string // e.g. "1 × 1kg bag"
  packs: number
}

/**
 * Spec §5/§6: express what to buy in terms of the ingredient's actual pack size
 * ("1 × 1kg bag") rather than just the raw required amount, when the pack's unit is
 * compatible with the requirement (same weight/volume family, or bridgeable via an
 * item ↔ weight reference). Returns null when it can't be determined — callers
 * should fall back to showing the raw quantity.
 */
export function suggestPurchase(
  toBuyQuantity: number,
  toBuyUnit: string,
  ingredient: Ingredient,
  pack: IngredientPrice | undefined,
  conversions: Map<string, UnitConversion>,
): PurchaseSuggestion | null {
  if (!pack || pack.pack_size <= 0 || toBuyQuantity <= 0) return null
  const equivalent = convertToUnit(ingredient, toBuyQuantity, toBuyUnit, pack.pack_size_unit, conversions)
  if (equivalent === null) return null
  const packs = Math.ceil(equivalent / pack.pack_size)
  if (packs <= 0) return null
  return { label: `${packs} × ${formatPackSize(pack.pack_size, pack.pack_size_unit)}`, packs }
}

export function groupByCategory<T extends { category: string | null }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const category = item.category ?? 'Other'
    const list = groups.get(category) ?? []
    list.push(item)
    groups.set(category, list)
  }
  return groups
}
