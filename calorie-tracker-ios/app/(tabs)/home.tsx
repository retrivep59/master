import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFoodLogStore } from '@/store/foodLogStore';
import { useUserStore } from '@/store/userStore';
import { useCalorieSummary } from '@/hooks/useCalorieSummary';
import { useTodayEntries } from '@/hooks/useTodayEntries';
import { CalorieRingCard } from '@/components/CalorieRingCard';
import { MacroSummaryCard } from '@/components/MacroSummaryCard';
import { MealTimeline } from '@/components/MealTimeline';
import { SmartSuggestionChip } from '@/components/SmartSuggestionChip';
import { QuickAddFAB } from '@/components/QuickAddFAB';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const { isLoading, hydrate } = useFoodLogStore();
  const { profile } = useUserStore();
  const { todayEntries, grouped } = useTodayEntries();
  const summary = useCalorieSummary(todayEntries, profile.dailyCalorieGoal);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={hydrate}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                {getGreeting()}, {profile.name || 'there'}! 👋
              </Text>
              <Text style={styles.date}>{formatDate()}</Text>
            </View>
          </View>

          {/* Calorie ring */}
          <CalorieRingCard summary={summary} goal={profile.dailyCalorieGoal} />

          {/* Macros */}
          <MacroSummaryCard summary={summary} profile={profile} />

          {/* Smart suggestion */}
          <SmartSuggestionChip />

          {/* Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Today's Meals</Text>
            <MealTimeline grouped={grouped} />
          </View>

          {/* Bottom space for FAB */}
          <View style={styles.fabSpacer} />
        </ScrollView>

        {/* FAB */}
        <QuickAddFAB />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundTint },
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: Spacing[2],
  },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timelineSection: {
    gap: Spacing[3],
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
  },
  fabSpacer: { height: 100 },
});
