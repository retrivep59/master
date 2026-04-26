import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useActivityStore } from '@/store/activityStore';

export function useLocationTracker(active: boolean) {
  const { appendRoutePoint, updateHeartRate, tickDuration } = useActivityStore();
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const heartRateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      locationSubRef.current?.remove();
      locationSubRef.current = null;
      if (heartRateRef.current) clearInterval(heartRateRef.current);
      if (durationRef.current) clearInterval(durationRef.current);
      return;
    }

    const start = async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return;

      locationSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
        (loc) => {
          appendRoutePoint({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp,
            accuracy: loc.coords.accuracy ?? undefined,
          });
        }
      );

      durationRef.current = setInterval(() => {
        tickDuration();
      }, 1000);

      heartRateRef.current = setInterval(() => {
        const bpm = 120 + Math.floor(Math.random() * 30);
        updateHeartRate(bpm);
      }, 3000);
    };

    start();

    return () => {
      locationSubRef.current?.remove();
      locationSubRef.current = null;
      if (heartRateRef.current) clearInterval(heartRateRef.current);
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [active, appendRoutePoint, updateHeartRate, tickDuration]);
}
