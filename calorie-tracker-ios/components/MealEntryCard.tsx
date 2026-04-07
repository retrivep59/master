import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { MealEntry } from '@/types/food';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'expo-router';

interface MealEntryCardProps {
  entry: MealEntry;
}

export function MealEntryCard({ entry }: MealEntryCardProps) {
  const router = useRouter();
  const { foodItem, loggedAt, quantity } = entry;
  const time = new Date(loggedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const totalCals = Math.round(foodItem.nutrition.calories * quantity);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/meal/${entry.id}`)}
      activeOpacity={0.8}
    >
      {/* Photo thumbnail or food emoji */}
      <View style={styles.thumb}>
        {foodItem.imageUri ? (
          <Image source={{ uri: foodItem.imageUri }} style={styles.thumbImg} />
        ) : (
          <Text style={styles.thumbEmoji}>🍽️</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {foodItem.name}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{time}</Text>
          {quantity !== 1 && (
            <Text style={styles.qty}> · ×{quantity}</Text>
          )}
        </View>
      </View>

      {/* Calories */}
      <View style={styles.right}>
        <Text style={styles.cals}>{totalCals}</Text>
        <Text style={styles.kcal}>kcal</Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    gap: Spacing[3],
    ...Shadows.subtle,
    marginBottom: Spacing[2],
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbEmoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  qty: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  right: {
    alignItems: 'flex-end',
  },
  cals: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  kcal: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
