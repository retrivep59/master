import { useMemo } from 'react';
import { MealEntry } from '@/types/food';

export interface CalorieSummary {
  consumed: number;
  remaining: number;
  protein: number;
  carbs: number;
  fat: number;
  percentConsumed: number;
}

export function useCalorieSummary(
  entries: MealEntry[],
  goal: number
): CalorieSummary {
  return useMemo(() => {
    const totals = entries.reduce(
      (acc, entry) => {
        const { nutrition } = entry.foodItem;
        const q = entry.quantity;
        return {
          calories: acc.calories + nutrition.calories * q,
          protein: acc.protein + nutrition.protein * q,
          carbs: acc.carbs + nutrition.carbs * q,
          fat: acc.fat + nutrition.fat * q,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const consumed = Math.round(totals.calories);
    const remaining = Math.max(0, goal - consumed);
    const percentConsumed = goal > 0 ? Math.min(consumed / goal, 1) : 0;

    return {
      consumed,
      remaining,
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      percentConsumed,
    };
  }, [entries, goal]);
}
