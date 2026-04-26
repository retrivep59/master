import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors, Shadows } from '@/constants/colors';
import { PressableScale } from './PressableScale';

interface NeonButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function NeonButton({ label, onPress, disabled }: NeonButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled, Shadows.neonBlue]}
    >
      <Text style={styles.label}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
