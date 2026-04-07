import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFoodLogStore } from '@/store/foodLogStore';
import { useUserStore } from '@/store/userStore';
import { useCalorieSummary } from '@/hooks/useCalorieSummary';
import { MealEntryCard } from '@/components/MealEntryCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { filterEntriesByDate } from '@/services/storage';

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function formatDay(d: Date): string {
  const today = dateStr(new Date());
  const ds = dateStr(d);
  if (ds === today) return 'Today';
  if (ds === dateStr(addDays(new Date(), -1))) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HistoryScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { entries } = useFoodLogStore();
  const { profile } = useUserStore();

  const dayEntries = useMemo(
    () => filterEntriesByDate(entries, dateStr(selectedDate)),
    [entries, selectedDate]
  );

  const summary = useCalorieSummary(dayEntries, profile.dailyCalorieGoal);

  // Build 7-day strip
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(new Date(), -(6 - i)));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>History</Text>

        {/* Date strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateStrip}
          contentContainerStyle={styles.dateStripContent}
        >
          {days.map((d) => {
            const ds = dateStr(d);
            const isSelected = ds === dateStr(selectedDate);
            const hasEntries = entries.some((e) => e.loggedAt.startsWith(ds));

            return (
              <TouchableOpacity
                key={ds}
                style={[styles.dayChip, isSelected && styles.dayChipActive]}
                onPress={() => setSelectedDate(d)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>
                  {d.getDate()}
                </Text>
                <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                {hasEntries && (
                  <View style={[styles.dot, isSelected && styles.dotActive]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Day summary card */}
        <GlassCard style={styles.summaryCard}>
          <Text style={styles.summaryDay}>{formatDay(selectedDate)}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.consumed.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>consumed</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: Colors.primaryDark }]}>
                {Math.round(summary.percentConsumed * 100)}%
              </Text>
              <Text style={styles.summaryLabel}>of goal</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{dayEntries.length}</Text>
              <Text style={styles.summaryLabel}>meals</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(summary.percentConsumed * 100, 100)}%` },
              ]}
            />
          </View>
        </GlassCard>

        {/* Entries list */}
        {dayEntries.length > 0 ? (
          <View style={styles.entries}>
            {dayEntries.map((entry) => (
              <MealEntryCard key={entry.id} entry={entry} />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No meals logged</Text>
            <Text style={styles.emptySubtext}>
              {dateStr(selectedDate) === dateStr(new Date())
                ? 'Add your first meal today!'
                : 'Nothing logged on this day.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  dateStrip: { marginHorizontal: -Spacing[5] },
  dateStripContent: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[2],
  },
  dayChip: {
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 52,
    gap: 2,
  },
  dayChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  dayNum: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  dayNumActive: { color: Colors.primaryDark },
  dayName: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  dayNameActive: { color: Colors.primaryDark },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
    marginTop: 2,
  },
  dotActive: { backgroundColor: Colors.primary },
  summaryCard: { paddingVertical: Spacing[4] },
  summaryDay: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
    marginBottom: Spacing[3],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  entries: { gap: Spacing[2] },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing[10],
    gap: Spacing[2],
  },
  emptyIcon: { fontSize: 40 },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
