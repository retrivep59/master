import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Shadows } from '@/constants/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface StepRingProps {
  steps: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export function StepRing({ steps, goal, size = 220, strokeWidth = 18 }: StepRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(steps / goal, 1), { duration: 1200 });
  }, [steps, goal]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const animatedHaloProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const animatedMidProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }, Shadows.neonBlue]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={Colors.primaryMuted}
          strokeWidth={strokeWidth}
          fill="none"
          rotation={-90}
          origin={`${cx}, ${cy}`}
        />
        {/* Outer halo glow */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={Colors.primary}
          strokeWidth={strokeWidth + 14}
          strokeOpacity={0.12}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedHaloProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${cx}, ${cy}`}
        />
        {/* Mid glow */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={Colors.primary}
          strokeWidth={strokeWidth + 6}
          strokeOpacity={0.3}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedMidProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${cx}, ${cy}`}
        />
        {/* Main arc */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={Colors.primaryBright}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <View style={styles.center}>
        <Ionicons name="walk" size={36} color={Colors.primary} />
        <Text style={styles.stepsText}>{steps.toLocaleString()}</Text>
        <Text style={styles.stepsLabel}>steps</Text>
        <Text style={styles.goalText}>Goal: {goal.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    textShadowColor: Colors.primaryGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  stepsLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  goalText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
