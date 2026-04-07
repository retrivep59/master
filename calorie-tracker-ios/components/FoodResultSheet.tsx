import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFoodLogStore } from '@/store/foodLogStore';
import { useSmartSuggestions } from '@/hooks/useSmartSuggestions';
import { FoodAnalysisResult, FoodAnalysisItem } from '@/types/ai';
import { MealEntry, FoodItem, MealType } from '@/types/food';
import { NeonButton } from '@/components/ui/NeonButton';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface FoodResultSheetProps {
  result: FoodAnalysisResult;
  photoUri?: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function FoodResultSheet({
  result,
  photoUri,
  onConfirm,
  onDismiss,
}: FoodResultSheetProps) {
  const { addEntry } = useFoodLogStore();
  const { mealType } = useSmartSuggestions();
  const [selectedMealType, setSelectedMealType] = useState<MealType>(mealType);
  const [isAdding, setIsAdding] = useState(false);

  const mainFood = result.foods[0];
  if (!mainFood) return null;

  const handleAdd = async () => {
    setIsAdding(true);
    const foodItem: FoodItem = {
      id: `food-${Date.now()}`,
      name: mainFood.name,
      nutrition: {
        calories: mainFood.estimatedCalories,
        protein: mainFood.estimatedProtein,
        carbs: mainFood.estimatedCarbs,
        fat: mainFood.estimatedFat,
      },
      servingSize: mainFood.servingDescription,
      imageUri: photoUri,
      source: photoUri ? 'ai-camera' : 'manual',
    };

    const entry: MealEntry = {
      id: `entry-${Date.now()}`,
      foodItem,
      mealType: selectedMealType,
      quantity: 1,
      loggedAt: new Date().toISOString(),
      photoUri,
    };

    await addEntry(entry);
    setIsAdding(false);
    onConfirm();
  };

  const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const CONFIDENCE_COLOR: Record<string, string> = {
    high: Colors.success,
    medium: Colors.warning,
    low: Colors.error,
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Identified Food</Text>
          <TouchableOpacity onPress={onDismiss}>
            <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Main result */}
        <GlassCard style={styles.resultCard}>
          <Text style={styles.foodName}>{mainFood.name}</Text>
          <Text style={styles.serving}>{mainFood.servingDescription}</Text>

          <View style={styles.calsRow}>
            <Text style={styles.cals}>{mainFood.estimatedCalories}</Text>
            <Text style={styles.kcalUnit}>kcal</Text>
            <View style={styles.confidenceBadge}>
              <View
                style={[
                  styles.confidenceDot,
                  { backgroundColor: CONFIDENCE_COLOR[result.confidence] },
                ]}
              />
              <Text style={styles.confidenceText}>{result.confidence} confidence</Text>
            </View>
          </View>

          <View style={styles.macroRow}>
            <MacroChip label="P" value={mainFood.estimatedProtein} color={Colors.protein} />
            <MacroChip label="C" value={mainFood.estimatedCarbs} color={Colors.carbs} />
            <MacroChip label="F" value={mainFood.estimatedFat} color={Colors.fat} />
          </View>

          {mainFood.portionNotes ? (
            <Text style={styles.portionNote}>📏 {mainFood.portionNotes}</Text>
          ) : null}

          <Text style={styles.disclaimer}>{result.disclaimer}</Text>
        </GlassCard>

        {/* Multiple foods detected */}
        {result.foods.length > 1 && (
          <View style={styles.extraFoods}>
            <Text style={styles.extraTitle}>Also detected:</Text>
            {result.foods.slice(1).map((food, i) => (
              <Text key={i} style={styles.extraFood}>
                • {food.name} (~{food.estimatedCalories} kcal)
              </Text>
            ))}
          </View>
        )}

        {/* Meal type selector */}
        <Text style={styles.sectionLabel}>Add to</Text>
        <View style={styles.mealTypes}>
          {MEAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.mealTypeBtn,
                selectedMealType === type && styles.mealTypeBtnActive,
              ]}
              onPress={() => setSelectedMealType(type)}
            >
              <Text
                style={[
                  styles.mealTypeBtnText,
                  selectedMealType === type && styles.mealTypeBtnTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.actions}>
          <NeonButton
            label={`Add ${mainFood.estimatedCalories} kcal`}
            onPress={handleAdd}
            loading={isAdding}
            style={styles.addBtn}
          />
          <NeonButton
            label="Retake"
            onPress={onDismiss}
            variant="outline"
            style={styles.retakeBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function MacroChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[styles.macroChip, { backgroundColor: `${color}18` }]}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <Text style={styles.macroValue}>{value}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[8],
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing[2],
    marginBottom: Spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
  },
  resultCard: {
    marginBottom: Spacing[4],
  },
  foodName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
    marginBottom: Spacing[1],
  },
  serving: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing[3],
  },
  calsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  cals: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  kcalUnit: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  macroChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
  },
  macroLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  macroValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  portionNote: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing[2],
  },
  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  extraFoods: {
    marginBottom: Spacing[4],
  },
  extraTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing[1],
  },
  extraFood: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing[2],
  },
  mealTypes: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[5],
  },
  mealTypeBtn: {
    flex: 1,
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealTypeBtnActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  mealTypeBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  mealTypeBtnTextActive: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
  actions: {
    gap: Spacing[3],
  },
  addBtn: {
    flex: 1,
  },
  retakeBtn: {
    flex: 1,
  },
});
