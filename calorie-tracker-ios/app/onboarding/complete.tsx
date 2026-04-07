import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { NeonButton } from '@/components/ui/NeonButton';
import { Colors, Shadows } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useUserStore } from '@/store/userStore';

export default function CompleteScreen() {
  const router = useRouter();
  const { completeOnboarding, profile } = useUserStore();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handleStart = async () => {
    await completeOnboarding();
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Glowing icon */}
        <Animated.View entering={FadeInDown.delay(0).duration(700)} style={styles.iconWrap}>
          <Animated.View style={[styles.glow, pulseStyle]} />
          <View style={[styles.icon, Shadows.neon]}>
            <Text style={styles.iconEmoji}>🎉</Text>
          </View>
        </Animated.View>

        {/* Text */}
        <Animated.View entering={FadeInDown.delay(200).duration(700)} style={styles.textGroup}>
          <Text style={styles.greeting}>
            You're all set,{'\n'}{profile.name}!
          </Text>
          <Text style={styles.subtitle}>
            Your daily goal is{' '}
            <Text style={styles.highlight}>
              {profile.dailyCalorieGoal.toLocaleString()} kcal
            </Text>
            {'\n'}Start tracking with a photo — it takes 2 seconds.
          </Text>
        </Animated.View>

        {/* Features summary */}
        <Animated.View entering={FadeInDown.delay(400).duration(700)} style={styles.features}>
          {[
            { emoji: '📷', text: 'Snap a photo → AI identifies calories' },
            { emoji: '🎤', text: 'Voice log — say what you ate' },
            { emoji: '📊', text: 'Track macros automatically' },
          ].map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(700)}>
          <NeonButton label="Start Tracking" onPress={handleStart} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[12],
    gap: Spacing[8],
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primaryGlow,
  },
  icon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 44 },
  textGroup: { gap: Spacing[3] },
  greeting: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
    lineHeight: FontSize['2xl'] * 1.25,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: FontSize.base * 1.6,
  },
  highlight: {
    color: Colors.primaryDark,
    fontWeight: FontWeight.bold,
  },
  features: {
    gap: Spacing[3],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  featureEmoji: { fontSize: 22 },
  featureText: {
    fontSize: FontSize.base,
    color: Colors.text,
    flex: 1,
  },
});
