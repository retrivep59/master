import { create } from 'zustand';
import { UserProfile, DEFAULT_PROFILE } from '@/types/user';
import { loadUserProfile, saveUserProfile } from '@/services/storage';

interface UserState {
  profile: UserProfile;
  isLoading: boolean;

  hydrate: () => Promise<void>;
  setProfile: (profile: UserProfile) => Promise<void>;
  updateGoal: (dailyCalorieGoal: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  isLoading: false,

  hydrate: async () => {
    set({ isLoading: true });
    const profile = await loadUserProfile();
    set({ profile, isLoading: false });
  },

  setProfile: async (profile) => {
    set({ profile });
    await saveUserProfile(profile);
  },

  updateGoal: async (dailyCalorieGoal) => {
    const updated = { ...get().profile, dailyCalorieGoal };
    set({ profile: updated });
    await saveUserProfile(updated);
  },

  completeOnboarding: async () => {
    const updated = { ...get().profile, onboardingComplete: true };
    set({ profile: updated });
    await saveUserProfile(updated);
  },
}));
