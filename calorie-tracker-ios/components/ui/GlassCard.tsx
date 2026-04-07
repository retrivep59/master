import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, Shadows } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/spacing';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noBorder?: boolean;
  noShadow?: boolean;
}

export function GlassCard({ children, style, noBorder, noShadow }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        !noBorder && styles.border,
        !noShadow && Shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glass,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing[5],
  },
  border: {
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
});
