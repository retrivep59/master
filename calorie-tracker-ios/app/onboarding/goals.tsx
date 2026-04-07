import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { NeonButton } from '@/components/ui/NeonButton';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { useUserStore } from '@/store/userStore';
import { ActivityLevel, ACTIVITY_CALORIE_MULTIPLIER } from '@/types/user';

const ACTIVITY_OPTIONS: { level: ActivityLevel; label: string; emoji: string; desc: string }[] = [
  { level: 'sedentary', label: 'Sedentary', emoji: '🪑', desc: 'Desk job, little exercise' },
  { level: 'light', label: 'Light', emoji: '🚶', desc: '1-3 days/week exercise' },
  { level: 'moderate', label: 'Moderate', emoji: '🏃', desc: '3-5 days/week exercise' },
  { level: 'active', label: 'Active', emoji: '💪', desc: '6-7 days/week exercise' },
  { level: 'very_active', label: 'Very Active', emoji: '🔥', desc: 'Athletic / physical job' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { setProfile, profile } = useUserStore();
  const [calories, setCalories] = useState(profile.dailyCalorieGoal);
  const [activity, setActivity] = useState<ActivityLevel>(profile.activityLevel);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const multiplier = ACTIVITY_CALORIE_MULTIPLIER[activity];
    await setProfile({
      ...profile,
      dailyCalorieGoal: calories,
      activityLevel: activity,
      // Auto-calculate macros (30% protein, 40% carbs, 30% fat)
      proteinGoalGrams: Math.round((calories * 0.3) / 4),
      carbGoalGrams: Math.round((calories * 0.4) / 4),
      fatGoalGrams: Math.round((calories * 0.3) / 9),
    });
    setLoading(false);
    router.push('/onboarding/complete');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={styles.title}>Set your goal</Text>
          <Text style={styles.subtitle}>We'll personalize your calorie tracking</Text>
        </Animated.View>

        {/* Calorie slider */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>Daily Calorie Goal</Text>
            <View style={styles.calBadge}>
              <Text style={styles.calValue}>{calories.toLocaleString()}</Text>
              <Text style={styles.calUnit}>kcal</Text>
            </View>
          </View>
          <Slider
            minimumValue={1200}
            maximumValue={4000}
            step={50}
            value={calories}
            onValueChange={setCalories}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.primary}
            style={styles.slider}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>1,200</Text>
            <Text style={styles.sliderLabel}>4,000</Text>
          </View>
        </Animated.View>

        {/* Activity level */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Level</Text>
          <View style={styles.activityGrid}>
            {ACTIVITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.level}
                style={[
                  styles.activityBtn,
                  activity === opt.level && styles.activityBtnActive,
                ]}
                onPress={() => setActivity(opt.level)}
                activeOpacity={0.8}
              >
                <Text style={styles.activityEmoji}>{opt.emoji}</Text>
                <Text
                  style={[
                    styles.activityLabel,
                    activity === opt.level && styles.activityLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={styles.activityDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <NeonButton
          label="Save & Continue →"
          onPress={handleSave}
          loading={loading}
          style={styles.cta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[8],
    paddingBottom: Spacing[10],
    gap: Spacing[7],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.dark,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginTop: Spacing[1],
  },
  section: {
    gap: Spacing[3],
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calBadge: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  calValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.primaryDark,
  },
  calUnit: {
    fontSize: FontSize.sm,
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  slider: { marginHorizontal: -Spacing[2] },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  activityGrid: {
    gap: Spacing[2],
  },
  activityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[4],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  activityBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  activityEmoji: { fontSize: 22 },
  activityLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    flex: 1,
  },
  activityLabelActive: { color: Colors.primaryDark },
  activityDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  cta: {},
});
