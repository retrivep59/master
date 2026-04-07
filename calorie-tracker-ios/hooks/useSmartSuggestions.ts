import { useMemo } from 'react';
import { MealType } from '@/types/food';

interface Suggestion {
  mealType: MealType;
  label: string;
  emoji: string;
}

function getMealTypeForHour(hour: number): MealType {
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'snack';
}

export function useSmartSuggestions(): Suggestion {
  return useMemo(() => {
    const hour = new Date().getHours();
    const mealType = getMealTypeForHour(hour);

    const map: Record<MealType, { label: string; emoji: string }> = {
      breakfast: { label: "Good morning! Log your breakfast", emoji: "🌅" },
      lunch: { label: "Lunch time! What are you eating?", emoji: "🍱" },
      dinner: { label: "Dinner time! Log your meal", emoji: "🌙" },
      snack: { label: "Snack time! Quick log it", emoji: "🍎" },
    };

    return { mealType, ...map[mealType] };
  }, []);
}
