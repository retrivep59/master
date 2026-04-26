import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { MOCK_STEP_FREQUENCY, MOCK_STEPS_TODAY } from '@/constants/mockData';
import type { StepFrequencySample } from '@/types/fitness';

const STORAGE_KEY = 'fit_steps_today';

interface StepState {
  todaySteps: number;
  dailyGoal: number;
  stepFrequency: StepFrequencySample[];
  isTracking: boolean;

  hydrate: () => Promise<void>;
  setTodaySteps: (steps: number) => void;
  setGoal: (goal: number) => Promise<void>;
  setFrequency: (samples: StepFrequencySample[]) => void;
}

export const useStepStore = create<StepState>((set, get) => ({
  todaySteps: 0,
  dailyGoal: 10000,
  stepFrequency: [],
  isTracking: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { date, steps, frequency, dailyGoal } = JSON.parse(raw);
        const today = new Date().toISOString().split('T')[0];
        if (date === today) {
          set({ todaySteps: steps, stepFrequency: frequency, dailyGoal: dailyGoal ?? 10000 });
          return;
        }
      }
    } catch {}
    set({ todaySteps: MOCK_STEPS_TODAY, stepFrequency: MOCK_STEP_FREQUENCY });
  },

  setTodaySteps: (steps) => {
    set({ todaySteps: steps });
    const { stepFrequency, dailyGoal } = get();
    const today = new Date().toISOString().split('T')[0];
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, steps, frequency: stepFrequency, dailyGoal }));
  },

  setGoal: async (goal) => {
    set({ dailyGoal: goal });
    const { todaySteps, stepFrequency } = get();
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, steps: todaySteps, frequency: stepFrequency, dailyGoal: goal }));
  },

  setFrequency: (samples) => set({ stepFrequency: samples }),
}));
