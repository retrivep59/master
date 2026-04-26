import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityCard } from '@/components/ActivityCard';
import { WeeklyDots } from '@/components/WeeklyDots';
import { Colors } from '@/constants/colors';
import { useActivityStore } from '@/store/activityStore';
import type { Activity } from '@/types/fitness';

export default function ActivityScreen() {
  const activities = useActivityStore((s) => s.activities);
  const weeklyActiveDays = useActivityStore((s) => s.weeklyActiveDays);

  const renderItem = ({ item }: { item: Activity }) => (
    <ActivityCard activity={item} onPress={() => Alert.alert(item.date, `${item.distanceKm} km • ${item.durationMinutes} min`)} />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={24} color={Colors.textSecondary} />
        <Text style={styles.title}>Activity History & Trends</Text>
        <Ionicons name="person-circle-outline" size={26} color={Colors.textSecondary} />
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.weeklySection}>
            <Text style={styles.sectionTitle}>Weekly Progress</Text>
            <WeeklyDots activeDays={weeklyActiveDays} />
            <Text style={styles.sectionTitle}>Recent Activities</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    gap: 0,
  },
  weeklySection: {
    gap: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  separator: {
    height: 10,
  },
});
