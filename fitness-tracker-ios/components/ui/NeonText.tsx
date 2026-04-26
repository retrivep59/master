import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface NeonTextProps {
  children: string | number;
  size?: number;
  weight?: '400' | '500' | '600' | '700' | '800';
  color?: string;
  glowColor?: string;
  style?: StyleProp<TextStyle>;
}

export function NeonText({
  children,
  size = 16,
  weight = '700',
  color = Colors.textPrimary,
  glowColor = Colors.primaryGlow,
  style,
}: NeonTextProps) {
  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: size,
          fontWeight: weight,
          color,
          textShadowColor: glowColor,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 12,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
