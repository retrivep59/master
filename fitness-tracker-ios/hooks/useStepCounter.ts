import { useEffect } from 'react';
import { Pedometer } from 'expo-sensors';
import { useStepStore } from '@/store/stepStore';

export function useStepCounter() {
  const setTodaySteps = useStepStore((s) => s.setTodaySteps);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = async () => {
      const available = await Pedometer.isAvailableAsync();
      if (!available) return;

      const { granted } = await Pedometer.requestPermissionsAsync();
      if (!granted) return;

      const fetchSteps = async () => {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        try {
          const { steps } = await Pedometer.getStepCountAsync(midnight, new Date());
          setTodaySteps(steps);
        } catch {}
      };

      await fetchSteps();
      intervalId = setInterval(fetchSteps, 60000);
    };

    start();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [setTodaySteps]);
}
