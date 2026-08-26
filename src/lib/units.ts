import type { Ingredient, IngredientUnitConversion } from '../types/models'

export const NUTRITION_BASIS_UNITS = ['g', 'kg', 'ml', 'l', 'item', 'serving', 'slice', 'piece', 'other'] as const
export const RECIPE_UNITS = ['g', 'kg', 'ml', 'l', 'item', 'slice', 'piece', 'tbsp', 'tsp', 'other'] as const
export const PACK_SIZE_UNITS = ['g', 'kg', 'ml', 'l', 'item', 'pack', 'bottle', 'tin', 'other'] as const
export const CONVERSION_TARGET_UNITS = ['g', 'ml'] as const

export type UnitFamily = 'weight' | 'volume' | 'other'

const WEIGHT_UNITS = new Set(['g', 'kg'])
const VOLUME_UNITS = new Set(['ml', 'l'])

export function unitFamily(unit: string): UnitFamily {
  if (WEIGHT_UNITS.has(unit)) return 'weight'
  if (VOLUME_UNITS.has(unit)) return 'volume'
  return 'other'
}

export function toGrams(amount: number, unit: string): number {
  return unit === 'kg' ? amount * 1000 : amount
}

export function toMl(amount: number, unit: string): number {
  return unit === 'l' ? amount * 1000 : amount
}

function toCanonical(amount: number, unit: string, family: UnitFamily): number {
  return family === 'weight' ? toGrams(amount, unit) : toMl(amount, unit)
}

export interface UnitConversion {
  equivalent_amount: number
  equivalent_unit: 'g' | 'ml'
}

/**
 * Converts `amount unit` of a specific ingredient into an equivalent amount expressed
 * in `toUnit`. Returns null when the conversion isn't known/safe (spec: never assume
 * ml = g, or that a "slice" weighs a specific amount, without an explicit conversion).
 */
export function convertToUnit(
  ingredient: Pick<Ingredient, 'reference_weight_g'>,
  amount: number,
  unit: string,
  toUnit: string,
  conversions: Map<string, UnitConversion>,
): number | null {
  if (unit === toUnit) return amount

  const fromFam = unitFamily(unit)
  const toFam = unitFamily(toUnit)

  if (fromFam !== 'other' && fromFam === toFam) {
    return toCanonical(amount, unit, fromFam) / toCanonical(1, toUnit, toFam)
  }

  const conv = conversions.get(unit)
  if (conv) {
    const amountInConvUnit = amount * conv.equivalent_amount // e.g. 2 tbsp * 15g/tbsp = 30g
    if (conv.equivalent_unit === toUnit) return amountInConvUnit
    const convFam = unitFamily(conv.equivalent_unit)
    if (convFam !== 'other' && convFam === toFam) {
      return toCanonical(amountInConvUnit, conv.equivalent_unit, convFam) / toCanonical(1, toUnit, toFam)
    }
  }

  // Bridge an item-like basis (toUnit) via an optional reference weight, e.g.
  // "1 banana ≈ 120g" lets a recipe measure bananas by weight instead of by item.
  if (toFam === 'other' && fromFam === 'weight' && ingredient.reference_weight_g) {
    const grams = toGrams(amount, unit)
    return grams / ingredient.reference_weight_g
  }

  return null
}

/** Groups a flat conversions list into ingredient_id -> (unit -> conversion), ready for convertToUnit(). */
export function buildConversionsByIngredient(rows: IngredientUnitConversion[]): Map<string, Map<string, UnitConversion>> {
  const byIngredient = new Map<string, Map<string, UnitConversion>>()
  for (const row of rows) {
    const forIngredient = byIngredient.get(row.ingredient_id) ?? new Map<string, UnitConversion>()
    forIngredient.set(row.unit, { equivalent_amount: row.equivalent_amount, equivalent_unit: row.equivalent_unit })
    byIngredient.set(row.ingredient_id, forIngredient)
  }
  return byIngredient
}

const COUNT_LIKE_UNITS = new Set(['item', 'pack', 'bottle', 'tin', 'other'])

/** e.g. formatPackSize(1000, 'g') -> "1kg", formatPackSize(6, 'item') -> "6 items" */
export function formatPackSize(size: number, unit: string): string {
  if (unit === 'g' && size >= 1000 && size % 1000 === 0) return `${size / 1000}kg`
  if (unit === 'ml' && size >= 1000 && size % 1000 === 0) return `${size / 1000}L`
  const rounded = Math.round(size * 100) / 100
  if (unit === 'l') return `${rounded}L`
  if (COUNT_LIKE_UNITS.has(unit)) return `${rounded} ${unit}${rounded === 1 ? '' : 's'}`
  return `${rounded}${unit}`
}
