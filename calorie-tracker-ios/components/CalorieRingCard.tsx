import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { CalorieSummary } from '@/hooks/useCalorieSummary';

interface CalorieRingCardProps {
  summary: CalorieSummary;
  goal: number;
}

export function CalorieRingCard({ summary, goal }: CalorieRingCardProps) {
  const { consumed, remaining, percentConsumed } = summary;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.ringContainer}>
        <ProgressRing
          size={180}
          strokeWidth={16}
          progress={percentConsumed}
          consumed={consumed}
          goal={goal}
        />
      </View>

      <View style={styles.footer}>
        <Stat label="Remaining" value={remaining} unit="kcal" accent />
        <View style={styles.divider} />
        <Stat label="Goal" value={goal} unit="kcal" />
      </View>
    </GlassCard>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: Colors.primaryDark }]}>
        {value.toLocaleString()}
      </Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: Spacing[6],
  },
  ringContainer: {
    marginBottom: Spacing[5],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  statUnit: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
});
