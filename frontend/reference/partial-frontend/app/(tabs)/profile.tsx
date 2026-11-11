import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Icon, IconName, s } from '@/components/marketplace/UI';
import { openAccount } from '@/components/account/AccountUI';
import { useMarketplace } from '@/context/MarketplaceContext';
import menus from '@/data/account-menu.json';
import { colors as c } from '@/theme/market';

type MenuItem = typeof menus.account[number];
export default function ProfileScreen() {
  const { width: viewportWidth } = useWindowDimensions();
  const { profile, ready, error, updateProfile, account } = useMarketplace();
  const width = ready ? viewportWidth : 0;
  const wide = width >= 850;
  const t = (en: string, te: string) => profile.language === 'te' ? te : en;
  const renderMenu = (items: MenuItem[]) => <View style={styles.menuCard}>{items.map((item, index) => <Pressable key={item.id} accessibilityRole="button" onPress={() => openAccount(item.id)} style={({ pressed }) => [styles.menuRow, index < items.length - 1 && styles.divider, pressed && { opacity: .6 }]}><View style={styles.menuIcon}><Icon name={item.icon as IconName} size={20} /></View><View style={styles.menuInfo}><Text style={styles.menuTitle}>{t(item.title, item.titleTe)}</Text><Text style={styles.menuSubtitle}>{item.id === 'verification' && account.verification.status !== 'unverified' ? (account.verification.status === 'approved' ? t('Verified buyer · demo', 'ధృవీకరించిన కొనుగోలుదారు · నమూనా') : t('Review pending · demo', 'సమీక్ష పెండింగ్ · నమూనా')) : t(item.subtitle, item.subtitleTe)}</Text></View><Icon name="chevron" size={20} color={c.ink} /></Pressable>)}</View>;
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <View style={styles.header}><View style={styles.headerInner}><Pressable accessibilityRole="button" accessibilityLabel={t('Back to Home', 'హోమ్‌కు తిరిగి')} onPress={() => router.replace('/')} style={styles.back}><Icon name="back" size={21} color={c.ink} /></Pressable><Text accessibilityRole="header" style={styles.headerTitle}>{t('Your account', 'మీ ఖాతా')}</Text>{width >= 700 && <View style={s.desktopNav}><Pressable accessibilityRole="link" onPress={() => router.push('/')} style={s.navItem}><Icon name="home" /><Text style={s.navText}>Home</Text></Pressable><View style={[s.navItem, s.navActive]}><Icon name="user" /><Text style={[s.navText, { color: c.forest }]}>Profile</Text></View></View>}</View></View>
    <View style={styles.prototype}><Text style={styles.prototypeText}>{t('OFFLINE PROTOTYPE · Sample listings and simulated transactions', 'ఆఫ్‌లైన్ నమూనా · నమూనా లిస్టింగ్‌లు మరియు లావాదేవీలు')}</Text></View>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"><View style={styles.content}>
      {!ready ? <ActivityIndicator color={c.forest} size="large" style={{ padding: 80 }} /> : <>
        <View style={[styles.columns, wide && { flexDirection: 'row' }]}>
          <View style={[styles.summary, wide && { width: 360 }]}>
            <View style={styles.accountHero}><View style={styles.person}><View style={styles.avatar}><Text style={styles.initials}>{profile.name.slice(0, 2).toUpperCase()}</Text></View><View style={{ flex: 1, minWidth: 0 }}><Text style={styles.name}>{profile.name}</Text><Text style={styles.identityMeta}>{profile.business} · {profile.city}</Text></View></View><Pressable accessibilityRole="button" onPress={() => updateProfile({ ...profile, role: profile.role === 'buyer' ? 'seller' : 'buyer' })} style={({ pressed }) => [styles.switchButton, pressed && { opacity: .7 }]}><Text style={styles.switchText}>{t('Switch to', 'మోడ్ మార్చండి')}: {profile.role === 'buyer' ? t('Selling mode', 'అమ్మకం మోడ్') : t('Buying mode', 'కొనుగోలు మోడ్')}</Text></Pressable></View>
            <View style={styles.stats}>{[{ value: account.ownListings.length, label: t('Your listings', 'మీ లిస్టింగ్‌లు') }, { value: account.completedTrades.length, label: t('Completed demo trades', 'పూర్తయిన నమూనా వ్యాపారాలు') }].map(item => <View key={item.label} style={styles.stat}><Text style={styles.statValue}>{item.value}</Text><Text style={styles.statLabel}>{item.label}</Text></View>)}</View>
            {renderMenu(menus.trust)}
          </View>
          <View style={styles.accountMenu}>{renderMenu(menus.account)}</View>
        </View>
        {!!error && <Text accessibilityRole="alert" style={styles.notice}>{error}</Text>}
        <Text style={styles.notice}>{t('Offline prototype v1.2. No connected live marketplace, real verification, insurance, payment protection or public listing links.', 'ఆఫ్‌లైన్ నమూనా v1.2. లైవ్ సర్వర్, నిజమైన ధృవీకరణ, బీమా, చెల్లింపు రక్షణ లేదా పబ్లిక్ లింకులు లేవు.')}</Text>
        <Pressable accessibilityRole="button" onPress={() => openAccount('insights')} style={styles.insights}><Icon name="chart" size={25} /><View style={styles.menuInfo}><Text style={styles.insightTitle}>{t('AI & local price insights', 'AI & ప్రాంతీయ ధర వివరాలు')}</Text><Text style={styles.menuSubtitle}>{t('Photo / video checks · area prices · buyer evidence', 'ఫోటో / వీడియో · ప్రాంతీయ ధరలు · నాణ్యత వివరాలు')}</Text></View><Icon name="chevron" size={20} /></Pressable>
      </>}
    </View></ScrollView>

  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, header: { borderBottomWidth: 1, borderColor: c.line }, headerInner: { maxWidth: 1100, width: '100%', alignSelf: 'center', minHeight: 70, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }, back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' }, headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: c.ink }, prototype: { backgroundColor: '#edf1e9', paddingHorizontal: 18, paddingVertical: 5 }, prototypeText: { fontSize: 10, lineHeight: 15, color: '#647763', textAlign: 'center', letterSpacing: .15 },
  scroll: { flexGrow: 1 }, content: { width: '100%', maxWidth: 1100, alignSelf: 'center', padding: 18, paddingBottom: 30, gap: 16 }, columns: { gap: 16 }, summary: { minWidth: 0, gap: 16 }, accountMenu: { flex: 1, minWidth: 0 }, accountHero: { borderRadius: 23, padding: 23, backgroundColor: c.forest }, person: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 47, height: 47, borderRadius: 15, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' }, initials: { fontSize: 17, fontWeight: '800', color: c.white }, name: { fontSize: 22, fontWeight: '700', color: c.white, lineHeight: 29, letterSpacing: -.3 }, identityMeta: { fontSize: 12, lineHeight: 18, color: '#d4e5d8', marginTop: 3 }, switchButton: { minHeight: 54, borderRadius: 16, backgroundColor: c.gold, marginTop: 18, paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' }, switchText: { fontSize: 17, fontWeight: '700', color: c.forest, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 12 }, stat: { flex: 1, padding: 17, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 16 }, statValue: { fontSize: 24, lineHeight: 32, color: c.forest, fontWeight: '700' }, statLabel: { fontSize: 12, lineHeight: 18, color: c.muted, marginTop: 2 },
  menuCard: { borderWidth: 1, borderColor: c.line, borderRadius: 18, backgroundColor: c.white, padding: 18 }, menuRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 16 }, divider: { borderBottomWidth: 1, borderColor: c.line }, menuIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }, menuInfo: { flex: 1, minWidth: 0 }, menuTitle: { fontSize: 14, lineHeight: 21, fontWeight: '700', color: c.ink }, menuSubtitle: { fontSize: 12, lineHeight: 18, color: c.muted, marginTop: 3 }, notice: { backgroundColor: '#eef5ee', borderWidth: 1, borderColor: '#d9e7d9', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, color: '#486950', fontSize: 13, lineHeight: 20 }, insights: { borderWidth: 1, borderColor: c.line, backgroundColor: c.white, borderRadius: 18, padding: 18, flexDirection: 'row', gap: 13, alignItems: 'center' }, insightTitle: { color: c.ink, fontSize: 15, fontWeight: '700', lineHeight: 22 },
});
