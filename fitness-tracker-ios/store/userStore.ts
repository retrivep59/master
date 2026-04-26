import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { MOCK_FRIENDS, MOCK_USER } from '@/constants/mockData';
import type { Friend, LeaderboardPeriod, UserProfile } from '@/types/fitness';

const USER_KEY = 'fit_user';
const FRIENDS_KEY = 'fit_friends';

interface UserState {
  profile: UserProfile;
  friends: Friend[];
  leaderboardPeriod: LeaderboardPeriod;

  hydrate: () => Promise<void>;
  setProfile: (profile: UserProfile) => Promise<void>;
  setLeaderboardPeriod: (period: LeaderboardPeriod) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: MOCK_USER,
  friends: MOCK_FRIENDS,
  leaderboardPeriod: 'weekly',

  hydrate: async () => {
    try {
      const [userRaw, friendsRaw] = await Promise.all([
        AsyncStorage.getItem(USER_KEY),
        AsyncStorage.getItem(FRIENDS_KEY),
      ]);
      const profile = userRaw ? (JSON.parse(userRaw) as UserProfile) : MOCK_USER;
      const friends = friendsRaw ? (JSON.parse(friendsRaw) as Friend[]) : MOCK_FRIENDS;
      set({ profile, friends });
    } catch {
      set({ profile: MOCK_USER, friends: MOCK_FRIENDS });
    }
  },

  setProfile: async (profile) => {
    set({ profile });
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(profile));
  },

  setLeaderboardPeriod: (leaderboardPeriod) => set({ leaderboardPeriod }),
}));
