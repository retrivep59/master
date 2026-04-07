import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { MealEntry, MealType } from '@/types/food';
import { MealEntryCard } from '@/components/MealEntryCard';
import { Badge } from '@/components/ui/Badge';
import { GroupedMeals } from '@/hooks/useTodayEntries';

interface MealSection {
  type: MealType;
  entries: MealEntry[];
}

interface MealTimelineProps {
  grouped: GroupedMeals;
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export function MealTimeline({ grouped }: MealTimelineProps) {
  const sections: MealSection[] = MEAL_ORDER
    .map((type) => ({ type, entries: grouped[type] }))
    .filter((s) => s.entries.length > 0);

  if (sections.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No meals logged today</Text>
        <Text style={styles.emptySubtext}>Tap + to add your first meal</Text>
      </View>
    );
  }

  return (
    <View>
      {sections.map((section) => {
        const sectionCals = section.entries.reduce(
          (sum, e) => sum + Math.round(e.foodItem.nutrition.calories * e.quantity),
          0
        );

        return (
          <View key={section.type} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Badge label={MEAL_LABELS[section.type]} mealType={section.type} />
              <Text style={styles.sectionCals}>{sectionCals} kcal</Text>
            </View>

            {section.entries.map((entry) => (
              <MealEntryCard key={entry.id} entry={entry} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[2],
  },
  sectionCals: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing[8],
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing[1],
  },
});
