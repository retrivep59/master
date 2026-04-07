import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFoodLogStore } from '@/store/foodLogStore';
import { MacroBar } from '@/components/ui/MacroBar';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { entries, removeEntry } = useFoodLogStore();

  const entry = entries.find((e) => e.id === id);

  if (!entry) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Meal not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { foodItem, mealType, loggedAt, quantity } = entry;
  const { nutrition } = foodItem;
  const totalCals = Math.round(nutrition.calories * quantity);
  const time = new Date(loggedAt).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Goals for macro bar (approximate per meal)
  const MEAL_GOALS = { protein: 50, carbs: 80, fat: 25 };

  const handleDelete = () => {
    Alert.alert(
      'Delete Meal',
      `Remove "${foodItem.name}" from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeEntry(entry.id);
            router.back();
          },
        },
      ]
    );
  };

  const SOURCE_LABELS: Record<string, string> = {
    'ai-camera': '📷 AI Camera',
    barcode: '📦 Barcode',
    manual: '✏️ Manual',
    voice: '🎤 Voice',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {foodItem.name}
        </Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo */}
        {foodItem.imageUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: foodItem.imageUri }} style={styles.photo} />
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoEmoji}>🍽️</Text>
          </View>
        )}

        {/* Meta */}
        <View style={styles.metaRow}>
          <Badge label={mealType} mealType={mealType} />
          <Text style={styles.time}>{time}</Text>
        </View>

        {/* Name + calories */}
        <View style={styles.titleSection}>
          <Text style={styles.foodName}>{foodItem.name}</Text>
          {foodItem.brand && <Text style={styles.brand}>{foodItem.brand}</Text>}
          <View style={styles.calsRow}>
            <Text style={styles.bigCals}>{totalCals.toLocaleString()}</Text>
            <Text style={styles.kcalUnit}>kcal</Text>
            {quantity !== 1 && (
              <Text style={styles.qty}> × {quantity} servings</Text>
            )}
          </View>
          <Text style={styles.serving}>{foodItem.servingSize}</Text>
        </View>

        {/* Nutrition breakdown */}
        <GlassCard style={styles.nutrCard}>
          <Text style={styles.sectionTitle}>Nutrition Facts</Text>
          <MacroBar
            label="Protein"
            value={Math.round(nutrition.protein * quantity * 10) / 10}
            goal={MEAL_GOALS.protein}
            color={Colors.protein}
          />
          <MacroBar
            label="Carbs"
            value={Math.round(nutrition.carbs * quantity * 10) / 10}
            goal={MEAL_GOALS.carbs}
            color={Colors.carbs}
          />
          <MacroBar
            label="Fat"
            value={Math.round(nutrition.fat * quantity * 10) / 10}
            goal={MEAL_GOALS.fat}
            color={Colors.fat}
          />
          {nutrition.fiber !== undefined && (
            <MacroBar
              label="Fiber"
              value={Math.round(nutrition.fiber * quantity * 10) / 10}
              goal={30}
              color={Colors.fiber}
            />
          )}
        </GlassCard>

        {/* Source */}
        <View style={styles.sourceRow}>
          <Text style={styles.sourceLabel}>
            Logged via {SOURCE_LABELS[foodItem.source] ?? foodItem.source}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundTint },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
    marginHorizontal: Spacing[3],
  },
  content: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[8],
    gap: Spacing[4],
  },
  photoWrap: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    height: 220,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    height: 180,
    backgroundColor: Colors.backgroundTint,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoEmoji: { fontSize: 60 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  titleSection: {
    gap: Spacing[1],
  },
  foodName: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  brand: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  calsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
  bigCals: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  kcalUnit: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  qty: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  serving: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  nutrCard: {},
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
    marginBottom: Spacing[3],
  },
  sourceRow: {
    alignItems: 'center',
  },
  sourceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
  },
  notFoundText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  backLink: {
    fontSize: FontSize.base,
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
});
