/**
 * Recipe types matching backend models
 */

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
}

export enum DietTag {
  HIGH_PROTEIN = 'high_protein',
  LOW_CARB = 'low_carb',
  KETO = 'keto',
  VEGAN = 'vegan',
  VEGETARIAN = 'vegetarian',
  GLUTEN_FREE = 'gluten_free',
  DAIRY_FREE = 'dairy_free',
  PALEO = 'paleo',
  MEDITERRANEAN = 'mediterranean',
  MEAL_PREP = 'meal_prep',
  QUICK = 'quick',
  POST_WORKOUT = 'post_workout',
}

export interface NutritionInfo {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
}

export interface Ingredient {
  name: string;
  amount: string;
  notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  meal_type: MealType;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  nutrition: NutritionInfo;
  ingredients: Ingredient[];
  instructions: string[];
  diet_tags: DietTag[];
  image_url?: string;
  is_featured: boolean;
  times_saved: number;
  average_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeSummary {
  id: string;
  name: string;
  meal_type: MealType;
  prep_time_minutes: number;
  calories: number;
  protein_g: number;
  diet_tags: DietTag[];
  image_url?: string;
  is_featured: boolean;
  is_saved: boolean;
}

export interface RecipeFilter {
  meal_type?: MealType;
  diet_tags?: DietTag[];
  max_prep_time?: number;
  max_calories?: number;
  min_protein?: number;
  is_featured?: boolean;
  search?: string;
}

export interface UserSavedRecipe {
  id: string;
  identity_id: string;
  recipe_id: string;
  recipe?: Recipe;
  saved_at: string;
}

// Display helpers
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  [MealType.BREAKFAST]: 'Breakfast',
  [MealType.LUNCH]: 'Lunch',
  [MealType.DINNER]: 'Dinner',
  [MealType.SNACK]: 'Snack',
};

export const DIET_TAG_LABELS: Record<DietTag, string> = {
  [DietTag.HIGH_PROTEIN]: 'High Protein',
  [DietTag.LOW_CARB]: 'Low Carb',
  [DietTag.KETO]: 'Keto',
  [DietTag.VEGAN]: 'Vegan',
  [DietTag.VEGETARIAN]: 'Vegetarian',
  [DietTag.GLUTEN_FREE]: 'Gluten Free',
  [DietTag.DAIRY_FREE]: 'Dairy Free',
  [DietTag.PALEO]: 'Paleo',
  [DietTag.MEDITERRANEAN]: 'Mediterranean',
  [DietTag.MEAL_PREP]: 'Meal Prep',
  [DietTag.QUICK]: 'Quick',
  [DietTag.POST_WORKOUT]: 'Post Workout',
};

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  [MealType.BREAKFAST]: '🌅',
  [MealType.LUNCH]: '☀️',
  [MealType.DINNER]: '🌙',
  [MealType.SNACK]: '🍎',
};
