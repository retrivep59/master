export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfile {
  name: string;
  dailyCalorieGoal: number;
  proteinGoalGrams: number;
  carbGoalGrams: number;
  fatGoalGrams: number;
  activityLevel: ActivityLevel;
  onboardingComplete: boolean;
  createdAt: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  dailyCalorieGoal: 2000,
  proteinGoalGrams: 150,
  carbGoalGrams: 250,
  fatGoalGrams: 65,
  activityLevel: 'moderate',
  onboardingComplete: false,
  createdAt: new Date().toISOString(),
};

export const ACTIVITY_CALORIE_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};
