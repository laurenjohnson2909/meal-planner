import type { Ingredient, PantryItemWithIngredient } from '../types/models'
import type { PlannedItemForReuse } from './reuse'

export interface ConsolidatedItem {
  ingredientId: string
  name: string
  category: string
  requiredQuantity: number
  unit: string
  pantryQuantity: number
  toBuyQuantity: number
}

/** Spec §8: combine quantities for the same ingredient across all recipes in the week. */
export function consolidateIngredients(planItems: PlannedItemForReuse[]): Map<string, { ingredient: Ingredient; quantity: number; unit: string }> {
  const combined = new Map<string, { ingredient: Ingredient; quantity: number; unit: string }>()

  for (const item of planItems) {
    const recipe = item.recipe
    if (!recipe) continue
    const servingFactor = item.servings / Math.max(recipe.servings, 1e-9)

    for (const line of recipe.recipe_ingredients) {
      const existing = combined.get(line.ingredient.id)
      const qty = line.quantity * servingFactor
      if (existing) {
        existing.quantity += qty
      } else {
        combined.set(line.ingredient.id, { ingredient: line.ingredient, quantity: qty, unit: line.unit })
      }
    }
  }

  return combined
}

/** Spec §9: subtract what's already in the pantry from what's required. */
export function buildShoppingList(
  required: Map<string, { ingredient: Ingredient; quantity: number; unit: string }>,
  pantry: PantryItemWithIngredient[],
): ConsolidatedItem[] {
  const pantryByIngredient = new Map<string, number>()
  for (const p of pantry) {
    pantryByIngredient.set(p.ingredient_id, (pantryByIngredient.get(p.ingredient_id) ?? 0) + p.quantity)
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

  return items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
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
