import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows } from '@/constants/colors';
import { NeonButton } from '@/components/ui/NeonButton';
import { useActivityStore } from '@/store/activityStore';

let MapView: any;
let Polyline: any;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Polyline = maps.Polyline;
  } catch {}
}

const INITIAL_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export default function MapScreen() {
  const activities = useActivityStore((s) => s.activities);

  const handleStartTracking = () => {
    router.push('/live-tracker');
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.container}>
        {MapView ? (
          <MapView
            style={StyleSheet.absoluteFillObject}
            mapType="satellite"
            initialRegion={INITIAL_REGION}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {Polyline &&
              activities.map((act) => (
                <React.Fragment key={act.id}>
                  <Polyline
                    coordinates={act.route}
                    strokeColor={Colors.routeGlow}
                    strokeWidth={8}
                    lineCap="round"
                  />
                  <Polyline
                    coordinates={act.route}
                    strokeColor={Colors.routeLine}
                    strokeWidth={3}
                    lineCap="round"
                  />
                </React.Fragment>
              ))}
          </MapView>
        ) : (
          <View style={styles.mapFallback}>
            <Ionicons name="map" size={64} color={Colors.primary} />
            <Text style={styles.fallbackText}>Map requires a development build</Text>
          </View>
        )}

        {/* Header overlay */}
        <SafeAreaView style={styles.headerOverlay} edges={['top']}>
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>Map</Text>
          </View>
        </SafeAreaView>

        {/* Start button */}
        <SafeAreaView style={styles.footer} edges={['bottom']}>
          <NeonButton label="Start Live Tracking" onPress={handleStartTracking} />
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  mapFallback: {
    flex: 1,
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
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: Colors.mapOverlay,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
});
