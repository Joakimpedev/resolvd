import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabBar } from '@/components/TabBar';
import { useAppRefetch } from '@/lib/useAppRefetch';

export default function AppLayout() {
  useAppRefetch();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props: BottomTabBarProps) => <TabBar {...props} />}
    >
      <Tabs.Screen name="feed"     options={{ title: 'Feed' }} />
      <Tabs.Screen name="laer"     options={{ title: 'Lær' }} />
      <Tabs.Screen name="oppgaver" options={{ title: 'Oppgaver' }} />
      <Tabs.Screen name="min-side" options={{ title: 'Min side' }} />
    </Tabs>
  );
}
