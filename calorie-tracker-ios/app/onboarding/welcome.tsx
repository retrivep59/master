import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { NeonButton } from '@/components/ui/NeonButton';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useUserStore } from '@/store/userStore';

export default function WelcomeScreen() {
  const [name, setName] = useState('');
  const router = useRouter();
  const { setProfile, profile } = useUserStore();

  const handleNext = async () => {
    if (!name.trim()) return;
    await setProfile({ ...profile, name: name.trim() });
    router.push('/onboarding/goals');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Logo */}
          <Animated.View entering={FadeInDown.delay(0).duration(600)} style={styles.logoWrap}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>⬡</Text>
            </View>
            <Text style={styles.appName}>CalorieAI</Text>
            <Text style={styles.tagline}>Smart nutrition, effortlessly.</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.form}>
            <Text style={styles.question}>What's your name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name..."
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
              selectionColor={Colors.primary}
            />
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.cta}>
            <NeonButton
              label="Let's Go →"
              onPress={handleNext}
              disabled={!name.trim()}
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[16],
    gap: Spacing[10],
  },
  logoWrap: {
    alignItems: 'center',
    gap: Spacing[2],
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  logoText: {
    fontSize: 40,
    color: Colors.dark,
  },
  appName: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  tagline: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing[3],
  },
  question: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark,
  },
  input: {
    height: 56,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    fontSize: FontSize.xl,
    color: Colors.dark,
    paddingVertical: Spacing[2],
  },
  cta: {},
});
