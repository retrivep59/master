import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline, Rect } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import type { Activity, LiveRoutePoint } from '@/types/fitness';
import { PressableScale } from './ui/PressableScale';

const THUMB_SIZE = 80;

function MiniMap({ route }: { route: LiveRoutePoint[] }) {
  const polyPoints = useMemo(() => {
    if (route.length < 2) return '';
    const lats = route.map((p) => p.latitude);
    const lons = route.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const latRange = maxLat - minLat || 0.001;
    const lonRange = maxLon - minLon || 0.001;
    const pad = 8;
    const inner = THUMB_SIZE - pad * 2;

    return route
      .map((p) => {
        const x = pad + ((p.longitude - minLon) / lonRange) * inner;
        const y = pad + (1 - (p.latitude - minLat) / latRange) * inner;
        return `${x},${y}`;
      })
      .join(' ');
  }, [route]);

  return (
    <Svg width={THUMB_SIZE} height={THUMB_SIZE} style={styles.miniMap}>
      <Rect width={THUMB_SIZE} height={THUMB_SIZE} fill="#1A2235" rx={10} />
      {polyPoints ? (
        <>
          <Polyline points={polyPoints} stroke={Colors.routeGlow} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points={polyPoints} stroke={Colors.routeLine} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
    </Svg>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

interface ActivityCardProps {
  activity: Activity;
  onPress: () => void;
}

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  return (
    <PressableScale onPress={onPress} style={styles.card}>
      <MiniMap route={activity.route} />
      <View style={styles.info}>
        <Text style={styles.date}>{formatDate(activity.date)}</Text>
        <View style={styles.statsRow}>
          <Ionicons name="speedometer-outline" size={13} color={Colors.primary} />
          <Text style={styles.stat}>{activity.distanceKm.toFixed(1)} km</Text>
          <Text style={styles.dot}>•</Text>
          <Ionicons name="time-outline" size={13} color={Colors.primary} />
          <Text style={styles.stat}>{formatDuration(activity.durationMinutes)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    gap: 12,
  },
  miniMap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    gap: 6,
  },
  date: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stat: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dot: {
    color: Colors.textMuted,
    marginHorizontal: 2,
  },
});
