import type { Ingredient, NutritionValues } from '../types/models'
import { ZERO_NUTRITION } from '../types/models'

const NUTRIENT_KEYS = Object.keys(ZERO_NUTRITION) as (keyof NutritionValues)[]

export function addNutrition(a: NutritionValues, b: NutritionValues): NutritionValues {
  const out = { ...ZERO_NUTRITION }
  for (const k of NUTRIENT_KEYS) out[k] = a[k] + b[k]
  return out
}

export function sumNutrition(items: NutritionValues[]): NutritionValues {
  return items.reduce(addNutrition, { ...ZERO_NUTRITION })
}

export function scaleNutrition(n: NutritionValues, factor: number): NutritionValues {
  const out = { ...ZERO_NUTRITION }
  for (const k of NUTRIENT_KEYS) out[k] = n[k] * factor
  return out
}

/** Spec §22: quantity / 100 * nutrient_per_100g */
export function ingredientContribution(ingredient: Ingredient, quantityGrams: number): NutritionValues {
  const factor = quantityGrams / 100
  return {
    calories: ingredient.calories_per_100g * factor,
    protein_g: ingredient.protein_per_100g * factor,
    carbs_g: ingredient.carbs_per_100g * factor,
    fat_g: ingredient.fat_per_100g * factor,
    fibre_g: ingredient.fibre_per_100g * factor,
    sugar_g: ingredient.sugar_per_100g * factor,
    saturated_fat_g: ingredient.saturated_fat_per_100g * factor,
    salt_g: ingredient.salt_per_100g * factor,
  }
}

export interface RecipeIngredientLine {
  ingredient_id: string
  quantity: number
  unit: string
  ingredient: Ingredient
}

/** Recipe totals = sum of all ingredient nutrients (spec §22). Assumes gram-equivalent units. */
export function recipeTotals(lines: RecipeIngredientLine[]): NutritionValues {
  return sumNutrition(lines.map((l) => ingredientContribution(l.ingredient, l.quantity)))
}

/** Per-serving = totals / servings (spec §22). */
export function recipePerServing(lines: RecipeIngredientLine[], servings: number): NutritionValues {
  const totals = recipeTotals(lines)
  return scaleNutrition(totals, 1 / Math.max(servings, 1e-9))
}

export function recipeCostTotal(lines: RecipeIngredientLine[], pricesByIngredient: Map<string, { price: number; quantity: number }>): number {
  return lines.reduce((sum, line) => {
    const p = pricesByIngredient.get(line.ingredient_id)
    if (!p || p.quantity <= 0) return sum
    return sum + (p.price / p.quantity) * line.quantity
  }, 0)
}

export function recipeCostPerServing(totalCost: number, servings: number): number {
  return totalCost / Math.max(servings, 1e-9)
}

// -- BMR / calorie target calculator (spec §2) --------------------------------

export type ActivityMultiplierMap = Record<string, number>

export const ACTIVITY_MULTIPLIERS: ActivityMultiplierMap = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const GOAL_ADJUSTMENT: Record<string, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
}

/** Spec §12: some days (e.g. Friday) can carry a different calorie target than the rest. */
export function calorieTargetForDay(
  targets: { calories: number; daily_calorie_overrides: Record<string, number> } | null | undefined,
  dayOfWeek: number,
): number {
  if (!targets) return 2000
  return targets.daily_calorie_overrides[String(dayOfWeek)] ?? targets.calories
}

/** Mifflin-St Jeor BMR, scaled by activity level, adjusted for goal. */
export function calculateCalorieTarget(opts: {
  sex: 'male' | 'female' | 'other'
  age: number
  heightCm: number
  weightKg: number
  activityLevel: keyof typeof ACTIVITY_MULTIPLIERS
  goal: 'lose' | 'maintain' | 'gain'
}): number {
  const { sex, age, heightCm, weightKg, activityLevel, goal } = opts
  const sexOffset = sex === 'male' ? 5 : sex === 'female' ? -161 : -78
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2)
  return Math.round(tdee + (GOAL_ADJUSTMENT[goal] ?? 0))
}

/** Simple macro split from a calorie target: 30% protein / 40% carbs / 30% fat. */
export function calculateMacroTargets(calories: number) {
  return {
    protein_g: Math.round((calories * 0.3) / 4),
    carbs_g: Math.round((calories * 0.4) / 4),
    fat_g: Math.round((calories * 0.3) / 9),
    fibre_g: 30,
    sugar_g: Math.round((calories * 0.1) / 4),
    saturated_fat_g: Math.round((calories * 0.1) / 9),
    salt_g: 6,
  }
}

export function recipeMatchesRemaining(
  perServing: NutritionValues,
  remainingCalories: number,
  remainingProtein: number,
): boolean {
  return perServing.calories <= remainingCalories + 200 && perServing.protein_g >= remainingProtein * 0.15
}
