import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { Icon } from '@/components/marketplace/UI';
import { colors } from '@/theme/market';
import { useMarketplace } from '@/context/MarketplaceContext';
export default function TabsLayout() {
  const { width: viewportWidth } = useWindowDimensions();
  const { ready } = useMarketplace();
  const width = ready ? viewportWidth : 0;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.forest, tabBarInactiveTintColor: colors.muted, tabBarStyle: width >= 700 ? { display: 'none' } : { backgroundColor: colors.white, borderTopColor: colors.line, paddingTop: 8, minHeight: 68 }, tabBarLabelStyle: { fontSize: 12, fontWeight: '600', paddingBottom: 5 } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Icon name="home" color={color} /> }} />
    <Tabs.Screen name="buy" options={{ href: null }} />
    <Tabs.Screen name="sell" options={{ href: null }} />
    <Tabs.Screen name="market" options={{ href: null }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Icon name="user" color={color} /> }} />
  </Tabs>;
}
