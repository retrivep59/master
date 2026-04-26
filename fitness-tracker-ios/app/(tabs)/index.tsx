import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartRateOverlay } from '@/components/HeartRateOverlay';
import { StatCard } from '@/components/StatCard';
import { StepFrequencyChart } from '@/components/StepFrequencyChart';
import { StepRing } from '@/components/StepRing';
import { Colors } from '@/constants/colors';
import { useStepCounter } from '@/hooks/useStepCounter';
import { useStepStore } from '@/store/stepStore';

export default function HomeScreen() {
  useStepCounter();

  const todaySteps = useStepStore((s) => s.todaySteps);
  const dailyGoal = useStepStore((s) => s.dailyGoal);
  const stepFrequency = useStepStore((s) => s.stepFrequency);

  const { width } = useWindowDimensions();
  const chartWidth = width - 48;

  const calories = useMemo(() => Math.round(todaySteps * 0.04), [todaySteps]);
  const distanceKm = useMemo(() => (todaySteps * 0.000762).toFixed(1), [todaySteps]);
  const activeMinutes = useMemo(
    () => Math.round((todaySteps * 0.000762) / 5 * 60),
    [todaySteps]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Step Dashboard</Text>
          <View style={styles.headerIcons}>
            <Ionicons name="person-circle-outline" size={28} color={Colors.textSecondary} />
            <Ionicons name="settings-outline" size={26} color={Colors.textSecondary} />
          </View>
        </View>

        <View style={styles.ringWrap}>
          <StepRing steps={todaySteps} goal={dailyGoal} />
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="flame-outline" value={String(calories)} unit="kcal" label="Calories Burned" />
          <View style={styles.statGap} />
          <StatCard icon="location-outline" value={String(distanceKm)} unit="km" label="Distance" />
          <View style={styles.statGap} />
          <StatCard icon="timer-outline" value={String(activeMinutes)} unit="min" label="Active Time" />
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Step Frequency</Text>
          {stepFrequency.length > 1 && (
            <StepFrequencyChart data={stepFrequency} width={chartWidth} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  ringWrap: {
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 0,
  },
  statGap: {
    width: 10,
  },
  chartSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
