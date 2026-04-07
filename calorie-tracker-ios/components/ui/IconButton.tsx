import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Shadows } from '@/constants/colors';
import { BorderRadius } from '@/constants/spacing';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  variant?: 'primary' | 'surface' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  size = 48,
  variant = 'surface',
  style,
}: IconButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        styles[variant],
        variant === 'primary' && Shadows.neon,
        animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.9, { damping: 20 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 20 }))}
      activeOpacity={0.85}
    >
      {icon}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  surface: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: Colors.primaryMuted,
  },
});
