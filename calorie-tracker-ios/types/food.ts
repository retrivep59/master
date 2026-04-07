export interface NutritionInfo {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
  fiber?: number;
  sugar?: number;
  sodium?: number; // mg
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  nutrition: NutritionInfo;
  servingSize: string;  // e.g. "1 cup (240g)"
  imageUri?: string;
  source: 'ai-camera' | 'barcode' | 'manual' | 'voice';
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id: string;
  foodItem: FoodItem;
  mealType: MealType;
  quantity: number;       // multiplier of servingSize (1.0 = one serving)
  loggedAt: string;       // ISO timestamp
  photoUri?: string;
  notes?: string;
}
