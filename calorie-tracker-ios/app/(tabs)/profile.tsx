import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFoodLogStore } from '@/store/foodLogStore';
import { useUserStore } from '@/store/userStore';
import { useCalorieSummary } from '@/hooks/useCalorieSummary';
import { useTodayEntries } from '@/hooks/useTodayEntries';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

export default function ProfileScreen() {
  const { profile, setProfile } = useUserStore();
  const { entries } = useFoodLogStore();
  const { todayEntries } = useTodayEntries();
  const todaySummary = useCalorieSummary(todayEntries, profile.dailyCalorieGoal);

  const [editing, setEditing] = useState(false);
  const [newGoal, setNewGoal] = useState(String(profile.dailyCalorieGoal));

  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  // Streak — count consecutive days with logged meals
  const streak = React.useMemo(() => {
    let count = 0;
    let d = new Date();
    while (count < 365) {
      const ds = d.toISOString().split('T')[0];
      const hasEntry = entries.some((e) => e.loggedAt.startsWith(ds));
      if (!hasEntry) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [entries]);

  const handleSaveGoal = async () => {
    const g = parseInt(newGoal, 10);
    if (!g || g < 800 || g > 9999) {
      Alert.alert('Invalid goal', 'Please enter a value between 800 and 9999 kcal.');
      return;
    }
    await setProfile({ ...profile, dailyCalorieGoal: g });
    setEditing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, Shadows.neon]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile.name || 'Set up your profile'}</Text>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streak} day streak</Text>
            </View>
          )}
        </View>

        {/* Today snapshot */}
        <GlassCard style={styles.todayCard}>
          <Text style={styles.cardTitle}>Today's Progress</Text>
          <View style={styles.statsRow}>
            <Stat
              value={todaySummary.consumed.toLocaleString()}
              label="consumed"
              unit="kcal"
            />
            <Stat
              value={`${Math.round(todaySummary.percentConsumed * 100)}%`}
              label="of goal"
              accent
            />
            <Stat
              value={String(todayEntries.length)}
              label="meals"
            />
          </View>
        </GlassCard>

        {/* Goal card */}
        <GlassCard style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.cardTitle}>Daily Goals</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={styles.editLink}>{editing ? 'Cancel' : '✎ Edit'}</Text>
            </TouchableOpacity>
          </View>

          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.goalInput}
                value={newGoal}
                onChangeText={setNewGoal}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                selectionColor={Colors.primary}
              />
              <Text style={styles.goalUnit}>kcal / day</Text>
              <NeonButton
                label="Save"
                onPress={handleSaveGoal}
                size="sm"
                style={styles.saveBtn}
              />
            </View>
          ) : (
            <View style={styles.goalRow}>
              <GoalItem label="Calories" value={profile.dailyCalorieGoal} unit="kcal" />
              <GoalItem label="Protein" value={profile.proteinGoalGrams} unit="g" />
              <GoalItem label="Carbs" value={profile.carbGoalGrams} unit="g" />
              <GoalItem label="Fat" value={profile.fatGoalGrams} unit="g" />
            </View>
          )}
        </GlassCard>

        {/* Activity level */}
        <GlassCard>
          <Text style={styles.cardTitle}>Activity Level</Text>
          <Text style={styles.activityValue}>
            {profile.activityLevel.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
          </Text>
        </GlassCard>

        {/* Total entries count */}
        <GlassCard>
          <Text style={styles.cardTitle}>All Time</Text>
          <View style={styles.statsRow}>
            <Stat value={String(entries.length)} label="total meals" />
            <Stat
              value={entries
                .reduce((s, e) => s + Math.round(e.foodItem.nutrition.calories * e.quantity), 0)
                .toLocaleString()}
              label="total kcal"
            />
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  value,
  label,
  unit,
  accent,
}: {
  value: string;
  label: string;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <View style={statStyles.wrap}>
      <Text style={[statStyles.value, accent && { color: Colors.primaryDark }]}>
        {value}
      </Text>
      {unit && <Text style={statStyles.unit}>{unit}</Text>}
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  value: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  unit: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});

function GoalItem({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={goalStyles.item}>
      <Text style={goalStyles.label}>{label}</Text>
      <Text style={goalStyles.value}>
        {value}
        <Text style={goalStyles.unit}> {unit}</Text>
      </Text>
    </View>
  );
}

const goalStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  label: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
  },
  unit: {
    fontWeight: FontWeight.regular,
    color: Colors.textMuted,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundTint },
  content: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[4],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  avatarSection: {
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
  },
  streakBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  streakText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#E65100',
  },
  todayCard: {},
  goalCard: {},
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
    marginBottom: Spacing[3],
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  editLink: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    fontWeight: FontWeight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalRow: { gap: 0 },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  goalInput: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    flex: 1,
    paddingVertical: Spacing[1],
  },
  goalUnit: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  saveBtn: { width: 72 },
  activityValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primaryDark,
  },
});
