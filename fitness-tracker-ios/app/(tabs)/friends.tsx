import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeaderboardRow } from '@/components/LeaderboardRow';
import { Colors } from '@/constants/colors';
import { useUserStore } from '@/store/userStore';
import type { Friend, LeaderboardPeriod } from '@/types/fitness';

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'all-time', label: 'All-Time' },
];

function getDateRangeLabel(period: LeaderboardPeriod): string {
  const now = new Date();
  if (period === 'weekly') {
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Weekly Steps: ${fmt(monday)} – ${fmt(sunday)}`;
  }
  if (period === 'monthly') {
    return `Monthly Steps: ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }
  return 'All-Time Steps';
}

export default function FriendsScreen() {
  const friends = useUserStore((s) => s.friends);
  const period = useUserStore((s) => s.leaderboardPeriod);
  const setLeaderboardPeriod = useUserStore((s) => s.setLeaderboardPeriod);

  const maxSteps = useMemo(() => {
    const steps = friends.map((f) =>
      period === 'monthly' ? f.monthlySteps : period === 'all-time' ? f.allTimeSteps : f.weeklySteps
    );
    return Math.max(...steps, 1);
  }, [friends, period]);

  const renderItem = ({ item }: { item: Friend }) => (
    <LeaderboardRow friend={item} period={period} maxSteps={maxSteps} />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={24} color={Colors.textSecondary} />
        <Text style={styles.title}>Social Leaderboard</Text>
        <Ionicons name="share-outline" size={24} color={Colors.textSecondary} />
      </View>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.segmented}>
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.segBtn, period === p.key && styles.segBtnActive]}
                  onPress={() => setLeaderboardPeriod(p.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segLabel, period === p.key && styles.segLabelActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.dateRange}>{getDateRangeLabel(period)}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listHeader: {
    gap: 12,
    marginBottom: 16,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: Colors.primary,
  },
  segLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  segLabelActive: {
    color: Colors.textPrimary,
  },
  dateRange: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  separator: {
    height: 8,
  },
});
