import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealEntry } from '@/types/food';
import { UserProfile, DEFAULT_PROFILE } from '@/types/user';

const KEYS = {
  MEAL_ENTRIES: 'calorie_ai_meal_entries',
  USER_PROFILE: 'calorie_ai_user_profile',
} as const;

// ─── Meal Entry Storage ────────────────────────────────────────────────────

export async function loadAllEntries(): Promise<MealEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.MEAL_ENTRIES);
  if (!raw) return [];
  return JSON.parse(raw) as MealEntry[];
}

export async function saveAllEntries(entries: MealEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.MEAL_ENTRIES, JSON.stringify(entries));
}

export async function addMealEntry(entry: MealEntry): Promise<MealEntry[]> {
  const existing = await loadAllEntries();
  const updated = [entry, ...existing];
  await saveAllEntries(updated);
  return updated;
}

export async function removeMealEntry(id: string): Promise<MealEntry[]> {
  const existing = await loadAllEntries();
  const updated = existing.filter((e) => e.id !== id);
  await saveAllEntries(updated);
  return updated;
}

export async function updateMealEntry(updated: MealEntry): Promise<MealEntry[]> {
  const existing = await loadAllEntries();
  const entries = existing.map((e) => (e.id === updated.id ? updated : e));
  await saveAllEntries(entries);
  return entries;
}

/** Returns all entries logged on a given calendar date (YYYY-MM-DD). */
export function filterEntriesByDate(entries: MealEntry[], dateStr: string): MealEntry[] {
  return entries.filter((e) => e.loggedAt.startsWith(dateStr));
}

// ─── User Profile Storage ──────────────────────────────────────────────────

export async function loadUserProfile(): Promise<UserProfile> {
  const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  if (!raw) return DEFAULT_PROFILE;
  return JSON.parse(raw) as UserProfile;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}
