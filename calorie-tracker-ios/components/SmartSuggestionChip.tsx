import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { useSmartSuggestions } from '@/hooks/useSmartSuggestions';

export function SmartSuggestionChip() {
  const router = useRouter();
  const { label, emoji } = useSmartSuggestions();

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={() => router.push('/scanner')}
      activeOpacity={0.8}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.textGroup}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>Tap to scan with AI →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.primaryMuted,
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    ...Shadows.card,
  },
  emoji: {
    fontSize: 28,
  },
  textGroup: {
    flex: 1,
  },
  label: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.dark,
  },
  sub: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    marginTop: 1,
  },
});
