import { useMemo } from 'react';
import { MealEntry, MealType } from '@/types/food';
import { useFoodLogStore } from '@/store/foodLogStore';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export interface GroupedMeals {
  breakfast: MealEntry[];
  lunch: MealEntry[];
  dinner: MealEntry[];
  snack: MealEntry[];
}

export function useTodayEntries() {
  const { entries, getEntriesForDate } = useFoodLogStore();

  const todayEntries = useMemo(
    () => getEntriesForDate(todayString()),
    [entries, getEntriesForDate]
  );

  const grouped = useMemo<GroupedMeals>(() => {
    const groups: GroupedMeals = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const entry of todayEntries) {
      groups[entry.mealType].push(entry);
    }
    return groups;
  }, [todayEntries]);

  return { todayEntries, grouped };
}
