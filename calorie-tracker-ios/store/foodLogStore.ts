import { create } from 'zustand';
import { MealEntry } from '@/types/food';
import {
  loadAllEntries,
  saveAllEntries,
  filterEntriesByDate,
} from '@/services/storage';

interface FoodLogState {
  entries: MealEntry[];
  isLoading: boolean;

  // Actions
  hydrate: () => Promise<void>;
  addEntry: (entry: MealEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  updateEntry: (entry: MealEntry) => Promise<void>;

  // Selectors
  getEntriesForDate: (dateStr: string) => MealEntry[];
}

export const useFoodLogStore = create<FoodLogState>((set, get) => ({
  entries: [],
  isLoading: false,

  hydrate: async () => {
    set({ isLoading: true });
    const entries = await loadAllEntries();
    set({ entries, isLoading: false });
  },

  addEntry: async (entry) => {
    const updated = [entry, ...get().entries];
    set({ entries: updated });
    await saveAllEntries(updated);
  },

  removeEntry: async (id) => {
    const updated = get().entries.filter((e) => e.id !== id);
    set({ entries: updated });
    await saveAllEntries(updated);
  },

  updateEntry: async (entry) => {
    const updated = get().entries.map((e) => (e.id === entry.id ? entry : e));
    set({ entries: updated });
    await saveAllEntries(updated);
  },

  getEntriesForDate: (dateStr) => {
    return filterEntriesByDate(get().entries, dateStr);
  },
}));
