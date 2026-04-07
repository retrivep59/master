import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/spacing';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface NeonButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

export function NeonButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  size = 'lg',
  style,
}: NeonButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 20 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20 });
  };

  const isDisabled = disabled || loading;

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        styles[variant],
        styles[size],
        isDisabled && styles.disabled,
        variant === 'primary' && !isDisabled && Shadows.neon,
        animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.dark : Colors.primary}
          size="small"
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`], styles[`${size}Label`]]}>
          {label}
        </Text>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Variants
  primary: {
    backgroundColor: Colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: Colors.primaryMuted,
  },
  disabled: {
    opacity: 0.45,
  },
  // Sizes
  sm: { height: 40, paddingHorizontal: Spacing[4] },
  md: { height: 48, paddingHorizontal: Spacing[5] },
  lg: { height: 56, paddingHorizontal: Spacing[6] },
  // Labels
  label: {
    fontWeight: FontWeight.bold,
  },
  primaryLabel: { color: Colors.dark },
  outlineLabel: { color: Colors.primary },
  ghostLabel: { color: Colors.primaryDark },
  smLabel: { fontSize: FontSize.sm },
  mdLabel: { fontSize: FontSize.base },
  lgLabel: { fontSize: FontSize.md },
});
