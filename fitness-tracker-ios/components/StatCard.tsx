import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Shadows } from '@/constants/colors';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  unit: string;
  label: string;
  iconColor?: string;
}

export function StatCard({ icon, value, unit, label, iconColor = Colors.primary }: StatCardProps) {
  return (
    <View style={[styles.card, Shadows.card]}>
      <View style={[styles.iconWrap, { backgroundColor: Colors.primaryMuted }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}> {unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  unit: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
