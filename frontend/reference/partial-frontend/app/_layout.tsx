import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MarketplaceProvider } from '@/context/MarketplaceContext';

export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  return <MarketplaceProvider><Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /></Stack><StatusBar style="dark" /></MarketplaceProvider>;
}
