import 'react-native-url-polyfill/auto';
import { useFonts, Syne_400Regular, Syne_500Medium, Syne_800ExtraBold } from '@expo-google-fonts/syne';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '@/lib/queryClient';
import { useSession } from '@/lib/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(app)/feed');
    }
  }, [session, isPending, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Syne_400Regular,
    Syne_500Medium,
    Syne_800ExtraBold,
  });
  const [fontTimedOut, setFontTimedOut] = useState(false);

  // Fail-safe: if fonts don't load in 4s (network issue, bad CDN, etc.),
  // proceed anyway with system fonts so the app doesn't hang on splash.
  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const ready = fontsLoaded || !!fontError || fontTimedOut;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
    if (fontError && __DEV__) console.warn('Font load error:', fontError);
    if (fontTimedOut && !fontsLoaded && __DEV__) console.warn('Fonts timed out; falling back to system fonts');
  }, [ready, fontError, fontTimedOut, fontsLoaded]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AuthGate>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
