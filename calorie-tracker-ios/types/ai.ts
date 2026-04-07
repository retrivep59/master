export interface FoodAnalysisItem {
  name: string;
  estimatedCalories: number;
  estimatedProtein: number;
  estimatedCarbs: number;
  estimatedFat: number;
  servingDescription: string;
  portionNotes: string;
}

export interface FoodAnalysisResult {
  confidence: 'high' | 'medium' | 'low';
  foods: FoodAnalysisItem[];
  totalCalories: number;
  explanation: string;
  disclaimer: string;
}
