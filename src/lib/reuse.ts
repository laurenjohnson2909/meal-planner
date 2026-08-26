import type { Ingredient, MealPlanItemWithDetails } from '../types/models'

export type PlannedItemForReuse = MealPlanItemWithDetails

export interface IngredientUsage {
  ingredient: Ingredient
  recipeCount: number
  recipeNames: string[]
  totalQuantity: number
  unit: string
  singleUse: boolean
}

/**
 * Spec §7: analyse ingredients used by recipes in the week's plan, count how many
 * recipes use each one, flag ingredients only used once. Matching is by ingredient
 * row id (canonical id) only — never by fuzzy name, so e.g. 5% vs 20% mince never merge.
 */
export function analyseIngredientReuse(planItems: PlannedItemForReuse[]): IngredientUsage[] {
  const byIngredient = new Map<string, IngredientUsage>()

  for (const item of planItems) {
    const recipe = item.recipe
    if (!recipe) continue
    const lines = recipe.recipe_ingredients
    if (!lines) continue

    const servingFactor = item.servings / Math.max(recipe.servings, 1e-9)
    const seenInThisRecipe = new Set<string>()

    for (const line of lines) {
      const existing = byIngredient.get(line.ingredient.id) ?? {
        ingredient: line.ingredient,
        recipeCount: 0,
        recipeNames: [],
        totalQuantity: 0,
        unit: line.unit,
        singleUse: false,
      }
      existing.totalQuantity += line.quantity * servingFactor
      if (!seenInThisRecipe.has(recipe.id)) {
        existing.recipeCount += 1
        existing.recipeNames.push(recipe.name)
        seenInThisRecipe.add(recipe.id)
      }
      byIngredient.set(line.ingredient.id, existing)
    }
  }

  const results = Array.from(byIngredient.values())
  for (const r of results) r.singleUse = r.recipeCount <= 1
  return results.sort((a, b) => b.recipeCount - a.recipeCount)
}

export function singleUseIngredients(usage: IngredientUsage[]): IngredientUsage[] {
  return usage.filter((u) => u.singleUse)
}

/** Recipes elsewhere in the library that could reuse an already-planned ingredient. */
export interface ReuseSuggestion {
  ingredient: Ingredient
  alternativeRecipeNames: string[]
}

export function suggestReuseAlternatives(
  singleUse: IngredientUsage[],
  allRecipesWithIngredients: { name: string; ingredientIds: string[] }[],
  plannedIngredientIds: Set<string>,
): ReuseSuggestion[] {
  return singleUse.map((u) => {
    const alternatives = allRecipesWithIngredients
      .filter((r) => r.ingredientIds.some((id) => plannedIngredientIds.has(id) && id !== u.ingredient.id))
      .map((r) => r.name)
    return { ingredient: u.ingredient, alternativeRecipeNames: [...new Set(alternatives)].slice(0, 5) }
  })
}
