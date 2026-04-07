import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { useFoodLogStore } from '@/store/foodLogStore';
import { useUserStore } from '@/store/userStore';
import { Colors } from '@/constants/colors';

export default function RootLayout() {
  const hydrateFood = useFoodLogStore((s) => s.hydrate);
  const hydrateUser = useUserStore((s) => s.hydrate);

  useEffect(() => {
    hydrateFood();
    hydrateUser();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={Colors.backgroundTint} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.backgroundTint },
            animation: 'fade_from_bottom',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding/welcome" />
          <Stack.Screen name="onboarding/goals" />
          <Stack.Screen name="onboarding/complete" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="scanner"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="manual-add"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="barcode"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="meal/[id]"
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
