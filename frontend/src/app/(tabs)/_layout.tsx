import { Tabs } from 'expo-router';
export default function TabsLayout() {
  return <Tabs screenOptions={{ tabBarActiveTintColor: '#236B3B', headerShown: true }}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} />
    <Tabs.Screen name="buy" options={{ title: 'Buy' }} />
    <Tabs.Screen name="sell" options={{ title: 'Sell' }} />
    <Tabs.Screen name="market" options={{ title: 'Market' }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
  </Tabs>;
}
