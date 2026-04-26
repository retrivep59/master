import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import type { Friend, LeaderboardPeriod } from '@/types/fitness';
import { GlassCard } from './ui/GlassCard';
import { PressableScale } from './ui/PressableScale';

function getSteps(friend: Friend, period: LeaderboardPeriod): number {
  if (period === 'monthly') return friend.monthlySteps;
  if (period === 'all-time') return friend.allTimeSteps;
  return friend.weeklySteps;
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name === 'You' ? 'ME' : name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={[styles.avatar, { backgroundColor: color }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

interface LeaderboardRowProps {
  friend: Friend;
  period: LeaderboardPeriod;
  maxSteps: number;
}

export function LeaderboardRow({ friend, period, maxSteps }: LeaderboardRowProps) {
  const steps = getSteps(friend, period);
  const pct = maxSteps > 0 ? steps / maxSteps : 0;

  return (
    <GlassCard glowBorder={friend.isCurrentUser} style={styles.card}>
      <View style={styles.rankWrap}>
        <Text style={styles.rank}>{friend.rank}</Text>
      </View>
      <Avatar name={friend.name} color={friend.avatarColor} />
      <View style={styles.info}>
        <Text style={styles.name}>{friend.name}</Text>
        <Text style={styles.sub}>Rank {friend.rank}, {steps.toLocaleString()} Steps</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct * 100}%` as any }]} />
        </View>
      </View>
      <PressableScale
        onPress={() => Alert.alert('Challenge sent!')}
        style={styles.challengeBtn}
      >
        <Text style={styles.challengeLabel}>⚡ Challenge</Text>
      </PressableScale>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  rankWrap: {
    width: 24,
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  barBg: {
    height: 4,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  challengeBtn: {
    backgroundColor: Colors.primaryMuted,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  challengeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryBright,
  },
});
