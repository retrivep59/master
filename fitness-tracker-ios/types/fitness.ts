export interface StepFrequencySample {
  hour: number;
  steps: number;
}

export interface LiveRoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
}

export interface Activity {
  id: string;
  date: string;
  distanceKm: number;
  durationMinutes: number;
  steps: number;
  calories: number;
  pace: string;
  route: LiveRoutePoint[];
}

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all-time';

export interface Friend {
  id: string;
  rank: number;
  name: string;
  rankTitle: string;
  avatarColor: string;
  weeklySteps: number;
  monthlySteps: number;
  allTimeSteps: number;
  isCurrentUser: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  subtitle: string;
  avatarColor: string;
  dailyStepGoal: number;
  weightKg: number;
  heightCm: number;
  totalSteps: number;
  totalDistanceKm: number;
  badgesEarned: number;
}

export interface Badge {
  id: string;
  label: string;
  icon: string;
  description: string;
  unlockedAt?: string;
  requirement: number;
}

export interface LiveSession {
  isActive: boolean;
  startedAt: number | null;
  route: LiveRoutePoint[];
  currentHeartRate: number;
  distanceKm: number;
  durationSeconds: number;
  currentPace: string;
}
