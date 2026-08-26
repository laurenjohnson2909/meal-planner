import type { Ingredient, NutritionValues } from '../types/models'
import { ZERO_NUTRITION } from '../types/models'
import { convertToUnit, type UnitConversion } from './units'

/** Conversions for a single ingredient: recipe unit -> its g/ml equivalent. */
export type ConversionsMap = Map<string, UnitConversion>
/** Conversions across many ingredients, keyed by ingredient_id — unit labels like "tbsp"
 * mean different things for different ingredients, so this is never a single flat map. */
export type ConversionsByIngredient = Map<string, ConversionsMap>
const NO_CONVERSIONS: ConversionsMap = new Map()
const NO_CONVERSIONS_BY_INGREDIENT: ConversionsByIngredient = new Map()

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

function nutritionOf(ingredient: Ingredient): NutritionValues {
  return {
    calories: ingredient.calories,
    protein_g: ingredient.protein_g,
    carbs_g: ingredient.carbs_g,
    fat_g: ingredient.fat_g,
    fibre_g: ingredient.fibre_g,
    sugar_g: ingredient.sugar_g,
    saturated_fat_g: ingredient.saturated_fat_g,
    salt_g: ingredient.salt_g,
  }
}

/**
 * Nutrition for `quantity unit` of an ingredient, scaled against its own nutrition
 * basis (e.g. 389 kcal per 100g, or 72 kcal per 1 item) — never assumes a fixed
 * per-100g basis. Returns null when the unit can't be safely resolved against the
 * basis (different unit family, no custom conversion, no reference weight to bridge
 * an item-based ingredient) rather than guessing.
 */
export function ingredientContribution(
  ingredient: Ingredient,
  quantity: number,
  unit: string,
  conversions: ConversionsMap = NO_CONVERSIONS,
): NutritionValues | null {
  const equivalent = convertToUnit(ingredient, quantity, unit, ingredient.nutrition_basis_unit, conversions)
  if (equivalent === null) return null
  const factor = equivalent / ingredient.nutrition_basis_amount
  return scaleNutrition(nutritionOf(ingredient), factor)
}

export interface RecipeIngredientLine {
  ingredient_id: string
  quantity: number
  unit: string
  ingredient: Ingredient
}

function convForLine(line: RecipeIngredientLine, byIngredient: ConversionsByIngredient): ConversionsMap {
  return byIngredient.get(line.ingredient_id) ?? NO_CONVERSIONS
}

/** Recipe totals = sum of all resolvable ingredient lines (spec §22/§2). */
export function recipeTotals(lines: RecipeIngredientLine[], conversions: ConversionsByIngredient = NO_CONVERSIONS_BY_INGREDIENT): NutritionValues {
  const resolved = lines
    .map((l) => ingredientContribution(l.ingredient, l.quantity, l.unit, convForLine(l, conversions)))
    .filter((v): v is NutritionValues => v !== null)
  return sumNutrition(resolved)
}

/** Per-serving = totals / servings (spec §22). */
export function recipePerServing(
  lines: RecipeIngredientLine[],
  servings: number,
  conversions: ConversionsByIngredient = NO_CONVERSIONS_BY_INGREDIENT,
): NutritionValues {
  const totals = recipeTotals(lines, conversions)
  return scaleNutrition(totals, 1 / Math.max(servings, 1e-9))
}

/** Lines whose nutrition can't be calculated — surface these in the UI rather than silently treating as zero. */
export function unresolvedLines(
  lines: RecipeIngredientLine[],
  conversions: ConversionsByIngredient = NO_CONVERSIONS_BY_INGREDIENT,
): RecipeIngredientLine[] {
  return lines.filter((l) => ingredientContribution(l.ingredient, l.quantity, l.unit, convForLine(l, conversions)) === null)
}

export interface IngredientPack {
  pack_price: number
  pack_size: number
  pack_size_unit: string
}

/** Estimated cost from each ingredient's pack price/size — independent of the nutrition basis (spec §3/§4). */
export function recipeCostTotal(
  lines: RecipeIngredientLine[],
  packsByIngredient: Map<string, IngredientPack>,
  conversions: ConversionsByIngredient = NO_CONVERSIONS_BY_INGREDIENT,
): number {
  return lines.reduce((sum, line) => {
    const pack = packsByIngredient.get(line.ingredient_id)
    if (!pack || pack.pack_size <= 0) return sum
    const equivalent = convertToUnit(line.ingredient, line.quantity, line.unit, pack.pack_size_unit, convForLine(line, conversions))
    if (equivalent === null) return sum
    return sum + (pack.pack_price / pack.pack_size) * equivalent
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
