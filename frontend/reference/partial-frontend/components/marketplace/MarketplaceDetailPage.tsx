import { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Icon } from '@/components/marketplace/UI';
import { openAccount } from '@/components/account/AccountUI';
import { useMarketplace } from '@/context/MarketplaceContext';
import { colors as c } from '@/theme/market';

export function MarketplaceDetailPage({ title, children }: PropsWithChildren<{ title: string }>) {
  const { ready, error, profile, updateProfile } = useMarketplace();
  const te = profile.language === 'te';
  const mode = (role: 'buyer' | 'seller') => { updateProfile({ ...profile, role }); router.replace('/'); };
  const items = [
    { label: te ? 'హోమ్' : 'Home', icon: 'home', action: () => router.replace('/') },
    { label: te ? 'కొనండి' : 'Buy', icon: 'search', action: () => mode('buyer') },
    { label: te ? 'అమ్మండి' : 'Sell', icon: 'plus', action: () => mode('seller') },
    { label: te ? 'కార్యాచరణ' : 'Activity', icon: 'wallet', action: () => openAccount('payments') },
    { label: te ? 'ప్రొఫైల్' : 'Profile', icon: 'user', action: () => router.replace('/profile') },
  ] as const;
  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={te ? 'వెనుకకు' : 'Back'} style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}><Icon name="back" size={19} /></Pressable>
      <Text accessibilityRole="header" style={styles.headerTitle}>{title}</Text>
    </View>
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.prototype}>{te ? 'స్థానిక నమూనా · నమూనా లిస్టింగ్‌లు మరియు లావాదేవీలు' : 'OFFLINE PROTOTYPE · Sample listings and simulated transactions'}</Text>
      <View style={styles.content}>{ready ? children : <ActivityIndicator size="large" color={c.forest} />}{!!error && <Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}</View>
    </ScrollView>
    <View style={styles.navigation}>{items.map(item => <Pressable key={item.icon} accessibilityRole="button" accessibilityLabel={item.label} onPress={item.action} style={styles.navItem}>
      <View style={item.icon === 'plus' ? styles.sellIcon : undefined}><Icon name={item.icon} size={item.icon === 'plus' ? 23 : 19} color={item.icon === 'plus' ? c.white : item.icon === 'home' ? c.forest : c.muted} /></View>
      <Text style={[styles.navLabel, item.icon === 'home' && { color: c.forest }]}>{item.label}</Text>
    </Pressable>)}</View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 18, minHeight: 68, borderBottomWidth: 1, borderColor: c.line },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: c.white, borderRadius: 15, borderWidth: 1, borderColor: c.line },
  headerTitle: { color: c.ink, fontWeight: '700', fontSize: 18, flex: 1 },
  scroll: { flexGrow: 1 },
  prototype: { color: c.muted, backgroundColor: '#eff3eb', textAlign: 'center', fontSize: 10, paddingHorizontal: 16, paddingVertical: 8 },
  content: { padding: 18, gap: 18, maxWidth: 760, width: '100%', alignSelf: 'center', paddingBottom: 32 },
  notice: { backgroundColor: '#edf5ee', borderWidth: 1, borderColor: '#deebdf', borderRadius: 15, padding: 15, color: '#45674d', fontSize: 13, lineHeight: 20 },
  navigation: { flexDirection: 'row', backgroundColor: c.white, borderTopWidth: 1, borderColor: c.line, minHeight: 76, paddingHorizontal: 10, paddingVertical: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 52 },
  navLabel: { color: c.muted, fontSize: 10, fontWeight: '600' },
  sellIcon: { backgroundColor: c.forest, width: 40, height: 40, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: -12 },
});
