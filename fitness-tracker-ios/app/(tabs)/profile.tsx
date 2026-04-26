import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HexBadge } from '@/components/HexBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, Shadows } from '@/constants/colors';
import { MOCK_BADGES } from '@/constants/mockData';
import { useStepStore } from '@/store/stepStore';
import { useUserStore } from '@/store/userStore';

export default function ProfileScreen() {
  const profile = useUserStore((s) => s.profile);
  const dailyGoal = useStepStore((s) => s.dailyGoal);
  const todaySteps = useStepStore((s) => s.todaySteps);

  const initials = profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const totalMiles = (profile.totalDistanceKm / 1.60934).toFixed(0);
  const goalProgress = Math.min(todaySteps / dailyGoal, 1);
  const heightFt = Math.floor(profile.heightCm / 30.48);
  const heightIn = Math.round((profile.heightCm / 30.48 - heightFt) * 12);
  const weightLbs = Math.round(profile.weightKg * 2.20462);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { borderColor: Colors.primaryBright }, Shadows.neonBlueSubtle]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.subtitle}>{profile.subtitle}</Text>

        {/* Stats pills */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statPill}>
            <Ionicons name="footsteps" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{(profile.totalSteps / 1_000_000).toFixed(1)}M</Text>
            <Text style={styles.statLabel}>Total Steps</Text>
          </GlassCard>
          <GlassCard style={styles.statPill}>
            <Ionicons name="map-outline" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{totalMiles}</Text>
            <Text style={styles.statLabel}>miles</Text>
          </GlassCard>
          <GlassCard style={styles.statPill}>
            <Ionicons name="shield-outline" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{profile.badgesEarned}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </GlassCard>
        </View>

        {/* Personal Goals */}
        <Text style={styles.sectionTitle}>Personal Goals</Text>
        <View style={styles.goalsRow}>
          <GlassCard style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Daily Step Goal</Text>
              <Ionicons
                name="pencil-outline"
                size={16}
                color={Colors.textSecondary}
                onPress={() => Alert.alert('Edit goal', 'Goal editing coming soon.')}
              />
            </View>
            <View style={styles.goalRingWrap}>
              <View style={styles.goalRingOuter}>
                <View style={[styles.goalRingFill, { transform: [{ rotate: `${goalProgress * 360}deg` }] }]} />
                <View style={styles.goalRingInner} />
              </View>
            </View>
            <Text style={styles.goalValue}>{dailyGoal.toLocaleString()}</Text>
          </GlassCard>
          <GlassCard style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Weight & Height</Text>
              <Ionicons
                name="pencil-outline"
                size={16}
                color={Colors.textSecondary}
                onPress={() => Alert.alert('Edit profile', 'Profile editing coming soon.')}
              />
            </View>
            <Text style={styles.weightHeight}>
              {weightLbs} lbs, {heightFt}'{heightIn}"
            </Text>
          </GlassCard>
        </View>

        {/* Badges */}
        <Text style={styles.sectionTitle}>Badges</Text>
        <View style={styles.badgesRow}>
          {MOCK_BADGES.map((badge) => (
            <HexBadge key={badge.id} badge={badge} size={88} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    marginTop: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    backgroundColor: Colors.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: -8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    padding: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    alignSelf: 'flex-start',
  },
  goalsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  goalCard: {
    flex: 1,
    gap: 10,
    alignItems: 'center',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  goalLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  goalRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalRingOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 5,
    borderColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopColor: Colors.primary,
  },
  goalRingFill: {},
  goalRingInner: {},
  goalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  weightHeight: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    flex: 1,
    textAlignVertical: 'center',
    paddingTop: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
    width: '100%',
  },
});
