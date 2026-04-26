import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartRateOverlay } from '@/components/HeartRateOverlay';
import { NeonButton } from '@/components/ui/NeonButton';
import { Colors, Shadows } from '@/constants/colors';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { useActivityStore } from '@/store/activityStore';

let MapView: any;
let Polyline: any;
let Marker: any;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Polyline = maps.Polyline;
    Marker = maps.Marker;
  } catch {}
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function GpsDot() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.gpsDot, animStyle]} />
  );
}

export default function LiveTrackerScreen() {
  const startSession = useActivityStore((s) => s.startSession);
  const stopSession = useActivityStore((s) => s.stopSession);
  const liveSession = useActivityStore((s) => s.liveSession);

  useLocationTracker(liveSession.isActive);

  useEffect(() => {
    startSession();
    return () => {};
  }, []);

  const handleFinish = () => {
    stopSession();
    router.back();
  };

  const lastPoint = liveSession.route[liveSession.route.length - 1];
  const region = lastPoint
    ? {
        latitude: lastPoint.latitude,
        longitude: lastPoint.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

  return (
    <View style={styles.container}>
      {/* Map layer */}
      {MapView ? (
        <MapView
          style={StyleSheet.absoluteFillObject}
          mapType="satellite"
          region={region}
          showsUserLocation={false}
        >
          {Polyline && liveSession.route.length > 1 && (
            <>
              <Polyline
                coordinates={liveSession.route}
                strokeColor={Colors.routeGlow}
                strokeWidth={10}
                lineCap="round"
              />
              <Polyline
                coordinates={liveSession.route}
                strokeColor={Colors.routeLine}
                strokeWidth={4}
                lineCap="round"
              />
            </>
          )}
          {Marker && lastPoint && (
            <Marker coordinate={lastPoint} anchor={{ x: 0.5, y: 0.5 }}>
              <GpsDot />
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={styles.mapFallback}>
          <Ionicons name="navigate" size={48} color={Colors.primary} />
          <Text style={styles.fallbackText}>Map requires a development build</Text>
        </View>
      )}

      {/* Header */}
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.header}>
          <Ionicons
            name="close"
            size={28}
            color={Colors.textPrimary}
            onPress={handleFinish}
          />
          <Text style={styles.headerTitle}>Live Path Tracker</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      {/* Heart rate overlay */}
      {liveSession.currentHeartRate > 0 && (
        <View style={styles.heartRatePos}>
          <HeartRateOverlay bpm={liveSession.currentHeartRate} />
        </View>
      )}

      {/* Bottom stats + finish */}
      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <BlurView intensity={70} tint="dark" style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.statValue}>{liveSession.distanceKm.toFixed(1)} km</Text>
            <Text style={styles.statLabel}>Total Distance</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Ionicons name="timer-outline" size={18} color={Colors.primary} />
            <Text style={styles.statValue}>{formatDuration(liveSession.durationSeconds)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Ionicons name="speedometer-outline" size={18} color={Colors.primary} />
            <Text style={styles.statValue}>{liveSession.currentPace}</Text>
            <Text style={styles.statLabel}>Current Pace</Text>
          </View>
        </BlurView>
        <View style={styles.finishWrap}>
          <NeonButton label="Finish" onPress={handleFinish} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundCardAlt,
    gap: 16,
  },
  fallbackText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.mapOverlay,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  heartRatePos: {
    position: 'absolute',
    top: 110,
    right: 16,
  },
  gpsDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...Shadows.neonBlue,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
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
  divider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  finishWrap: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
