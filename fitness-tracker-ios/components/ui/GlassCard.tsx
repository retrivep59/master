import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Shadows } from '@/constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowBorder?: boolean;
  noPadding?: boolean;
}

export function GlassCard({ children, style, glowBorder, noPadding }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        glowBorder && styles.glowBorder,
        noPadding && styles.noPadding,
        glowBorder && Shadows.neonBlueSubtle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  glowBorder: {
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.backgroundElevated,
  },
  noPadding: {
    padding: 0,
  },
});
