import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useActivityStore } from '@/store/activityStore';
import { useStepStore } from '@/store/stepStore';
import { useUserStore } from '@/store/userStore';

export default function RootLayout() {
  const hydrateSteps = useStepStore((s) => s.hydrate);
  const hydrateActivity = useActivityStore((s) => s.hydrate);
  const hydrateUser = useUserStore((s) => s.hydrate);

  useEffect(() => {
    hydrateSteps();
    hydrateActivity();
    hydrateUser();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0F1E' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="live-tracker"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', headerShown: false }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
