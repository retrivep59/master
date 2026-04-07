import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';
import { MealType } from '@/types/food';

const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: Colors.breakfast,
  lunch: Colors.lunch,
  dinner: Colors.dinner,
  snack: Colors.snack,
};

interface BadgeProps {
  label: string;
  mealType?: MealType;
  color?: string;
  style?: ViewStyle;
}

export function Badge({ label, mealType, color, style }: BadgeProps) {
  const bg = color ?? (mealType ? MEAL_TYPE_COLORS[mealType] : Colors.primary);

  return (
    <View style={[styles.badge, { backgroundColor: `${bg}22` }, style]}>
      <Text style={[styles.text, { color: bg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'capitalize',
  },
});
