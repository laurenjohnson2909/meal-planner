import type { MealSlot, MealType, NutritionValues, OptimisePriority, RecipeWithDetails } from '../types/models'
import { recipeCostTotal, recipeCostPerServing, recipePerServing, type ConversionsByIngredient, type IngredientPack } from './nutrition'

export interface OptimiseSlot {
  key: string // unique id for the slot, e.g. `${dayOfWeek}-${mealSlot}`
  dayOfWeek: number
  mealSlot: MealSlot
  locked: boolean
  lockedRecipeId?: string | null
}

export interface OptimiserInput {
  slots: OptimiseSlot[]
  recipes: RecipeWithDetails[]
  priority: OptimisePriority
  dailyCalorieTarget: number
  dailyProteinTarget: number
  packsByIngredient: Map<string, IngredientPack>
  conversions?: ConversionsByIngredient
  maxRepeatsPerRecipe?: number
}

export interface OptimiserResult {
  assignments: Map<string, string> // slot key -> recipe id (unlocked slots only)
  estimatedWeeklyCost: number
}

const MEAL_SLOT_TO_TYPE: Record<MealSlot, MealType> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snacks: 'snack',
}

/**
 * Spec §17 "Optimise My Week" — greedy priority-based solver. Respects locked
 * meals, tries to stay near daily calorie/protein targets, reuses ingredients
 * already chosen this week, and caps how often the same recipe repeats.
 */
export function optimiseWeek(input: OptimiserInput): OptimiserResult {
  const { slots, recipes, priority, dailyCalorieTarget, dailyProteinTarget, packsByIngredient } = input
  const conversions = input.conversions ?? new Map()
  const maxRepeats = input.maxRepeatsPerRecipe ?? 2

  const assignments = new Map<string, string>()
  const usedIngredientIds = new Set<string>()
  const recipeUseCount = new Map<string, number>()
  const dayTotals = new Map<number, NutritionValues>()

  // Seed running state from locked slots so unlocked picks react to them.
  for (const slot of slots.filter((s) => s.locked && s.lockedRecipeId)) {
    const recipe = recipes.find((r) => r.id === slot.lockedRecipeId)
    if (!recipe) continue
    for (const line of recipe.recipe_ingredients) usedIngredientIds.add(line.ingredient_id)
    recipeUseCount.set(recipe.id, (recipeUseCount.get(recipe.id) ?? 0) + 1)
    const perServing = recipePerServing(recipe.recipe_ingredients, recipe.servings)
    dayTotals.set(slot.dayOfWeek, addDay(dayTotals.get(slot.dayOfWeek), perServing))
  }

  const unlockedSlots = slots.filter((s) => !s.locked)

  for (const slot of unlockedSlots) {
    const mealType = MEAL_SLOT_TO_TYPE[slot.mealSlot]
    let candidates = recipes.filter((r) => r.meal_type === mealType)
    if (candidates.length === 0) candidates = recipes // fall back to any recipe if none tagged for this slot
    candidates = candidates.filter((r) => (recipeUseCount.get(r.id) ?? 0) < maxRepeats)
    if (candidates.length === 0) candidates = recipes.filter((r) => r.meal_type === mealType)
    if (candidates.length === 0) continue

    const dayTotal = dayTotals.get(slot.dayOfWeek) ?? zeroNutrition()
    const remainingCalories = dailyCalorieTarget - dayTotal.calories
    const remainingProtein = dailyProteinTarget - dayTotal.protein_g

    const scored = candidates.map((recipe) => ({
      recipe,
      score: scoreRecipe(recipe, priority, {
        usedIngredientIds,
        remainingCalories,
        remainingProtein,
        packsByIngredient,
        conversions,
        recipeUseCount,
      }),
    }))
    scored.sort((a, b) => b.score - a.score)
    const chosen = scored[0].recipe

    assignments.set(slot.key, chosen.id)
    recipeUseCount.set(chosen.id, (recipeUseCount.get(chosen.id) ?? 0) + 1)
    for (const line of chosen.recipe_ingredients) usedIngredientIds.add(line.ingredient_id)
    const perServing = recipePerServing(chosen.recipe_ingredients, chosen.servings)
    dayTotals.set(slot.dayOfWeek, addDay(dayTotals.get(slot.dayOfWeek), perServing))
  }

  let estimatedWeeklyCost = 0
  for (const slot of slots) {
    const recipeId = slot.locked ? slot.lockedRecipeId : assignments.get(slot.key)
    const recipe = recipes.find((r) => r.id === recipeId)
    if (!recipe) continue
    const total = recipeCostTotal(recipe.recipe_ingredients, packsByIngredient, conversions)
    estimatedWeeklyCost += recipeCostPerServing(total, recipe.servings)
  }

  return { assignments, estimatedWeeklyCost }
}

function scoreRecipe(
  recipe: RecipeWithDetails,
  priority: OptimisePriority,
  ctx: {
    usedIngredientIds: Set<string>
    remainingCalories: number
    remainingProtein: number
    packsByIngredient: Map<string, IngredientPack>
    conversions: ConversionsByIngredient
    recipeUseCount: Map<string, number>
  },
): number {
  const perServing = recipePerServing(recipe.recipe_ingredients, recipe.servings)
  const totalCost = recipeCostTotal(recipe.recipe_ingredients, ctx.packsByIngredient, ctx.conversions)
  const costPerServing = recipeCostPerServing(totalCost, recipe.servings)
  const overlapCount = recipe.recipe_ingredients.filter((l) => ctx.usedIngredientIds.has(l.ingredient_id)).length
  const overlapRatio = recipe.recipe_ingredients.length > 0 ? overlapCount / recipe.recipe_ingredients.length : 0
  const repeatPenalty = (ctx.recipeUseCount.get(recipe.id) ?? 0) * 5
  const closeToTarget = -Math.abs(perServing.calories - Math.max(ctx.remainingCalories, 0))

  switch (priority) {
    case 'lowest_cost':
      return -costPerServing * 10 - repeatPenalty
    case 'lowest_waste':
      return overlapRatio * 100 - repeatPenalty
    case 'highest_protein':
      return perServing.protein_g * 2 - repeatPenalty
    case 'lowest_calories':
      return -perServing.calories - repeatPenalty
    case 'most_variety':
      return -repeatPenalty * 10 + Math.random() * 2
    case 'balanced':
    default:
      return closeToTarget * 0.5 + overlapRatio * 30 - costPerServing * 3 - repeatPenalty
  }
}

function zeroNutrition(): NutritionValues {
  return {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fibre_g: 0,
    sugar_g: 0,
    saturated_fat_g: 0,
    salt_g: 0,
  }
}

function addDay(current: NutritionValues | undefined, add: NutritionValues): NutritionValues {
  const base = current ?? zeroNutrition()
  return {
    calories: base.calories + add.calories,
    protein_g: base.protein_g + add.protein_g,
    carbs_g: base.carbs_g + add.carbs_g,
    fat_g: base.fat_g + add.fat_g,
    fibre_g: base.fibre_g + add.fibre_g,
    sugar_g: base.sugar_g + add.sugar_g,
    saturated_fat_g: base.saturated_fat_g + add.saturated_fat_g,
    salt_g: base.salt_g + add.salt_g,
  }
}
