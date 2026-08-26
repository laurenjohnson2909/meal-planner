import type { PantryItemWithIngredient, RecipeWithDetails } from '../types/models'
import { recipePerServing, type ConversionsByIngredient } from './nutrition'

export interface RecommendedRecipe {
  recipe: RecipeWithDetails
  ownedIngredientCount: number
  missingIngredientCount: number
  missingIngredientNames: string[]
  fitsRemaining: boolean
}

/**
 * Spec §16 "What Can I Make?" — recipes ranked by how many ingredients you already
 * have (pantry + already-planned this week), preferring ones needing few/no new
 * purchases and that fit what's left of today's calorie/protein budget.
 */
export function whatCanIMake(
  recipes: RecipeWithDetails[],
  pantry: PantryItemWithIngredient[],
  alreadyPlannedIngredientIds: Set<string>,
  remainingCalories: number,
  remainingProtein: number,
  conversions: ConversionsByIngredient = new Map(),
): RecommendedRecipe[] {
  const ownedIds = new Set<string>([
    ...pantry.filter((p) => p.quantity > 0).map((p) => p.ingredient_id),
    ...alreadyPlannedIngredientIds,
  ])

  const results: RecommendedRecipe[] = recipes.map((recipe) => {
    const lines = recipe.recipe_ingredients
    const owned = lines.filter((l) => ownedIds.has(l.ingredient_id))
    const missing = lines.filter((l) => !ownedIds.has(l.ingredient_id))
    const perServing = recipePerServing(lines, recipe.servings, conversions)
    const fitsCalories = perServing.calories <= Math.max(remainingCalories, 0) + 200 || remainingCalories <= 0
    const helpsProtein = remainingProtein <= 0 || perServing.protein_g >= remainingProtein * 0.15
    return {
      recipe,
      ownedIngredientCount: owned.length,
      missingIngredientCount: missing.length,
      missingIngredientNames: missing.map((l) => l.ingredient.name),
      fitsRemaining: fitsCalories && helpsProtein,
    }
  })

  return results.sort((a, b) => {
    if (a.missingIngredientCount !== b.missingIngredientCount) {
      return a.missingIngredientCount - b.missingIngredientCount
    }
    if (a.fitsRemaining !== b.fitsRemaining) return a.fitsRemaining ? -1 : 1
    return b.ownedIngredientCount - a.ownedIngredientCount
  })
}
