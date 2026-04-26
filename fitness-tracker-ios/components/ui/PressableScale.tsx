import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  onPress: () => void;
  scale?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PressableScale({ onPress, scale = 0.96, children, style }: PressableScaleProps) {
  const pressed = useSharedValue(false);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? scale : 1, { damping: 15, stiffness: 200 }) }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { pressed.value = true; }}
      onPressOut={() => { pressed.value = false; }}
      onPress={onPress}
      style={[animStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
