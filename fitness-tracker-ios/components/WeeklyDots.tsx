import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WeeklyDotsProps {
  activeDays: boolean[];
}

function DayDot({ label, active, isToday }: { label: string; active: boolean; isToday: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isToday) {
      scale.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        true
      );
    }
  }, [isToday]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.dayWrap}>
      <Animated.View
        style={[
          styles.dot,
          active ? styles.dotActive : styles.dotInactive,
          isToday && styles.dotToday,
          animStyle,
        ]}
      />
      <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{label}</Text>
    </View>
  );
}

interface WeeklyDotsProps {
  activeDays: boolean[];
}

export function WeeklyDots({ activeDays }: WeeklyDotsProps) {
  const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0

  return (
    <View style={styles.row}>
      {DAY_LABELS.map((label, i) => (
        <DayDot
          key={label}
          label={label}
          active={activeDays[i] ?? false}
          isToday={i === todayIndex}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayWrap: {
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  dotInactive: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dotToday: {
    borderWidth: 2,
    borderColor: Colors.primaryBright,
  },
  dayLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  dayLabelActive: {
    color: Colors.textSecondary,
  },
});
