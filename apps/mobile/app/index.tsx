// Root index — redirects to the appropriate group based on auth state.
// Expo Router needs an entry point at `/`; this handles the initial landing.

import { Redirect } from 'expo-router';
import { useSession } from '@/lib/auth';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/theme/tokens';

export default function Index() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accentGreen} />
      </View>
    );
  }

  return <Redirect href={session ? '/(app)/feed' : '/(auth)/login'} />;
}
