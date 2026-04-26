import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { MOCK_ACTIVITIES, MOCK_WEEKLY_ACTIVE_DAYS } from '@/constants/mockData';
import type { Activity, LiveRoutePoint, LiveSession } from '@/types/fitness';

const STORAGE_KEY = 'fit_activities';

function haversineKm(a: LiveRoutePoint, b: LiveRoutePoint): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function formatPace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm === 0) return '--';
  const minutesPerKm = durationSeconds / 60 / distanceKm;
  const mins = Math.floor(minutesPerKm);
  const secs = Math.round((minutesPerKm - mins) * 60);
  return `${mins}'${String(secs).padStart(2, '0')}"`;
}

function deriveWeeklyActiveDays(activities: Activity[]): boolean[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const dateStr = day.toISOString().split('T')[0];
    return activities.some((a) => a.date === dateStr);
  });
}

const defaultSession: LiveSession = {
  isActive: false,
  startedAt: null,
  route: [],
  currentHeartRate: 0,
  distanceKm: 0,
  durationSeconds: 0,
  currentPace: '--',
};

interface ActivityState {
  activities: Activity[];
  weeklyActiveDays: boolean[];
  liveSession: LiveSession;

  hydrate: () => Promise<void>;
  addActivity: (activity: Activity) => Promise<void>;
  startSession: () => void;
  stopSession: () => Activity | null;
  appendRoutePoint: (point: LiveRoutePoint) => void;
  updateHeartRate: (bpm: number) => void;
  tickDuration: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  weeklyActiveDays: MOCK_WEEKLY_ACTIVE_DAYS,
  liveSession: defaultSession,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const activities: Activity[] = JSON.parse(raw);
        set({ activities, weeklyActiveDays: deriveWeeklyActiveDays(activities) });
        return;
      }
    } catch {}
    set({ activities: MOCK_ACTIVITIES, weeklyActiveDays: MOCK_WEEKLY_ACTIVE_DAYS });
  },

  addActivity: async (activity) => {
    const activities = [activity, ...get().activities];
    set({ activities, weeklyActiveDays: deriveWeeklyActiveDays(activities) });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  },

  startSession: () => {
    set({ liveSession: { ...defaultSession, isActive: true, startedAt: Date.now() } });
  },

  stopSession: () => {
    const { liveSession, addActivity } = get();
    if (!liveSession.isActive || liveSession.route.length < 2) {
      set({ liveSession: defaultSession });
      return null;
    }
    const durationMinutes = Math.round(liveSession.durationSeconds / 60);
    const steps = Math.round(liveSession.distanceKm / 0.000762);
    const activity: Activity = {
      id: `act-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      distanceKm: Math.round(liveSession.distanceKm * 10) / 10,
      durationMinutes,
      steps,
      calories: Math.round(steps * 0.04),
      pace: liveSession.currentPace,
      route: liveSession.route,
    };
    set({ liveSession: defaultSession });
    addActivity(activity);
    return activity;
  },

  appendRoutePoint: (point) => {
    const { liveSession } = get();
    const route = [...liveSession.route, point];
    let distanceKm = liveSession.distanceKm;
    if (route.length >= 2) {
      distanceKm += haversineKm(route[route.length - 2], route[route.length - 1]);
    }
    const currentPace = formatPace(distanceKm, liveSession.durationSeconds);
    set({ liveSession: { ...liveSession, route, distanceKm, currentPace } });
  },

  updateHeartRate: (bpm) => {
    set((s) => ({ liveSession: { ...s.liveSession, currentHeartRate: bpm } }));
  },

  tickDuration: () => {
    set((s) => {
      const durationSeconds = s.liveSession.durationSeconds + 1;
      const currentPace = formatPace(s.liveSession.distanceKm, durationSeconds);
      return { liveSession: { ...s.liveSession, durationSeconds, currentPace } };
    });
  },
}));
