export type Sex = 'male' | 'female' | 'other'
export type Goal = 'lose' | 'maintain' | 'gain'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type FoodSourceType = 'recipe' | 'ingredient' | 'packaged' | 'restaurant' | 'takeaway' | 'custom'
export type Intensity = 'low' | 'moderate' | 'high'
export type OptimisePriority =
  | 'lowest_cost'
  | 'lowest_waste'
  | 'highest_protein'
  | 'lowest_calories'
  | 'most_variety'
  | 'balanced'

export interface NutritionValues {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number
  sugar_g: number
  saturated_fat_g: number
  salt_g: number
}

export const ZERO_NUTRITION: NutritionValues = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fibre_g: 0,
  sugar_g: 0,
  saturated_fat_g: 0,
  salt_g: 0,
}

export interface UserProfile {
  id: string
  name: string | null
  age: number | null
  sex: Sex | null
  height_cm: number | null
  weight_kg: number | null
  goal: Goal | null
  target_weight_kg: number | null
  activity_level: ActivityLevel | null
  updated_at: string
}

export interface NutritionTargets extends NutritionValues {
  user_id: string
  /** day_of_week (0=Mon..6=Sun) -> calorie override, e.g. a higher Friday target. */
  daily_calorie_overrides: Record<string, number>
  updated_at: string
}

export interface Ingredient {
  id: string
  user_id: string
  name: string
  brand: string | null
  category: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fibre_per_100g: number
  sugar_per_100g: number
  saturated_fat_per_100g: number
  salt_per_100g: number
  default_unit: string
  created_at: string
}

export interface IngredientPrice {
  id: string
  user_id: string
  ingredient_id: string
  price: number
  quantity: number
  unit: string
  updated_at: string
}

export interface Recipe {
  id: string
  user_id: string
  name: string
  description: string | null
  meal_type: MealType | null
  category: string | null
  servings: number
  prep_time_min: number | null
  cook_time_min: number | null
  notes: string | null
  instructions: string[]
  image_url: string | null
  is_favourite: boolean
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_id: string
  quantity: number
  unit: string
  sort_order: number
}

export interface RecipeTag {
  id: string
  recipe_id: string
  tag: string
}

export interface RecipeWithDetails extends Recipe {
  recipe_ingredients: (RecipeIngredient & { ingredient: Ingredient })[]
  recipe_tags: RecipeTag[]
}

export interface Takeaway {
  id: string
  user_id: string
  restaurant: string | null
  meal: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  notes: string | null
  created_at: string
}

export interface MealPlan {
  id: string
  user_id: string
  week_start_date: string
}

export interface MealPlanItem {
  id: string
  meal_plan_id: string
  day_of_week: number
  meal_slot: MealSlot
  recipe_id: string | null
  takeaway_id: string | null
  free_text: string | null
  servings: number
  is_takeaway: boolean
  locked: boolean
  sort_order: number
}

export interface MealPlanItemWithDetails extends MealPlanItem {
  recipe: RecipeWithDetails | null
  takeaway: Takeaway | null
}

export interface FoodLog {
  id: string
  user_id: string
  date: string
}

export interface FoodLogItem extends NutritionValues {
  id: string
  food_log_id: string
  logged_at: string
  meal_slot: MealSlot | null
  source_type: FoodSourceType
  source_id: string | null
  description: string | null
  quantity: number
  unit: string
  created_at: string
}

export interface ExerciseLog {
  id: string
  user_id: string
  type: string
  date: string
  duration_min: number | null
  intensity: Intensity | null
  calories_burned: number | null
  notes: string | null
  created_at: string
}

export interface PantryItem {
  id: string
  user_id: string
  ingredient_id: string
  quantity: number
  unit: string
  use_by_date: string | null
  updated_at: string
}

export interface PantryItemWithIngredient extends PantryItem {
  ingredient: Ingredient
}

export interface Leftover {
  id: string
  user_id: string
  recipe_id: string | null
  portions_remaining: number
  date_cooked: string
  use_by_date: string | null
  notes: string | null
}

export interface LeftoverWithRecipe extends Leftover {
  recipe: Recipe | null
}

export interface ShoppingList {
  id: string
  user_id: string
  week_start_date: string
}

export interface ShoppingListItem {
  id: string
  shopping_list_id: string
  ingredient_id: string | null
  name: string
  quantity: number
  unit: string
  category: string | null
  checked: boolean
  is_manual: boolean
  sort_order: number
}

export interface WeightLog {
  id: string
  user_id: string
  date: string
  weight_kg: number
  notes: string | null
}

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks']
export const INGREDIENT_CATEGORIES = [
  'Meat & Protein',
  'Fruit & Vegetables',
  'Dairy',
  'Cupboard',
  'Bakery',
  'Frozen',
  'Drinks',
  'Other',
] as const
export const RECIPE_TAGS = [
  'High Protein',
  'Low Calorie',
  'Cheap',
  'Quick',
  'Meal Prep',
  'Freezer Friendly',
  'Vegetarian',
  'Chicken',
  'Beef',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Takeaway Alternative',
] as const
