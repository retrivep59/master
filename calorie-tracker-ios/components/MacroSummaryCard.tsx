import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { MacroBar } from '@/components/ui/MacroBar';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { CalorieSummary } from '@/hooks/useCalorieSummary';
import { UserProfile } from '@/types/user';

interface MacroSummaryCardProps {
  summary: CalorieSummary;
  profile: UserProfile;
}

export function MacroSummaryCard({ summary, profile }: MacroSummaryCardProps) {
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.title}>Macros Today</Text>
      <View style={styles.bars}>
        <MacroBar
          label="Protein"
          value={summary.protein}
          goal={profile.proteinGoalGrams}
          color={Colors.protein}
        />
        <MacroBar
          label="Carbs"
          value={summary.carbs}
          goal={profile.carbGoalGrams}
          color={Colors.carbs}
        />
        <MacroBar
          label="Fat"
          value={summary.fat}
          goal={profile.fatGoalGrams}
          color={Colors.fat}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing[4],
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
    marginBottom: Spacing[3],
  },
  bars: {
    gap: 2,
  },
});
