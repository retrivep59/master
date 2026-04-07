import { Redirect } from 'expo-router';
import { useUserStore } from '@/store/userStore';

export default function Index() {
  const { profile, isLoading } = useUserStore();

  if (isLoading) return null; // splash/loading handled by Expo

  if (!profile.onboardingComplete) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
