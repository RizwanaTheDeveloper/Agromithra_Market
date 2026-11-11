import { PropsWithChildren } from 'react';
import { ActivityIndicator, ColorValue, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowLeft, faPhone, faClipboardList, faCommentDots, faCalendarDays,
  faStar, faWallet, faLeaf, faHouse, faUser, faMagnifyingGlass,
  faLocationDot, faArrowRight, faChevronRight, faHeart, faShieldHalved,
  faLock, faChartColumn, faCircleQuestion, faXmark, faCheck, faGlobe, faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { artwork } from '@/data/artwork';
import { colors as c } from '@/theme/market';
import { useMarketplace } from '@/context/MarketplaceContext';

const icons = {
  back: faArrowLeft,
  phone: faPhone,
  request: faClipboardList,
  chat: faCommentDots,
  calendar: faCalendarDays,
  star: faStar,
  wallet: faWallet,
  leaf: faLeaf,
  home: faHouse,
  user: faUser,
  search: faMagnifyingGlass,
  pin: faLocationDot,
  arrow: faArrowRight,
  chevron: faChevronRight,
  heart: faHeart,
  shield: faShieldHalved,
  lock: faLock,
  chart: faChartColumn,
  help: faCircleQuestion,
  close: faXmark,
  check: faCheck,
  globe: faGlobe,
  plus: faPlus,
};
export type IconName = keyof typeof icons;
export function Icon({ name, size = 22, color = c.forest }: { name: IconName; size?: number; color?: ColorValue }) {
  return <FontAwesomeIcon icon={icons[name]} size={size} color={typeof color === 'string' ? color : c.forest} />;
}
export function Art({ name, width = 80, height = 80 }: { name: string; width?: number | string; height?: number }) {
  return <SvgXml xml={artwork[name] || artwork.landscape} width={width} height={height} />;
}
export function Button({ title, onPress, secondary = false, icon, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; icon?: IconName; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, { opacity: pressed || disabled ? .6 : 1 }]}>{icon && <Icon name={icon} size={19} color={secondary ? c.forest : c.white} />}<Text style={[s.buttonText, secondary && { color: c.forest }]}>{title}</Text></Pressable>;
}
export function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={s.sectionHead}><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text>{action && <Pressable accessibilityRole="button" onPress={onPress} style={s.link}><Text style={s.linkText}>{action} →</Text></Pressable>}</View>;
}
export function InfoModal({ title, onClose, children }: PropsWithChildren<{ title: string; onClose: () => void }>) {
  return <Modal transparent animationType="fade" onRequestClose={onClose}><View style={s.overlay}><View accessibilityViewIsModal style={s.modal}><View style={s.modalHead}><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close dialog" onPress={onClose} style={s.iconButton}><Icon name="close" /></Pressable></View><ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">{children}</ScrollView></View></View></Modal>;
}
export function Page({ children }: PropsWithChildren) {
  const { width: viewportWidth } = useWindowDimensions();
  const { ready, error } = useMarketplace();
  const width = ready ? viewportWidth : 0;
  const profilePage = usePathname().endsWith('profile');
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}><View style={s.header}><View style={[s.headerInner, { paddingHorizontal: width < 600 ? 20 : 32 }]}><Pressable onPress={() => router.push("/")} accessibilityRole="link" accessibilityLabel="Agromitra Market home" style={s.brand}><View style={s.brandmark}><Icon name="leaf" color="white" size={26} /></View><View><Text style={s.brandName}>Agromitra</Text><Text style={s.brandSub}>M A R K E T</Text></View></Pressable>{width >= 700 ? <View style={s.desktopNav}>{[{ href: '/' as const, title: 'Home', icon: 'home' as const, active: !profilePage }, { href: '/profile' as const, title: 'Profile', icon: 'user' as const, active: profilePage }].map(item => <Pressable key={item.title} accessibilityRole="link" onPress={() => router.push(item.href)} style={[s.navItem, item.active && s.navActive]}><Icon name={item.icon} /><Text style={[s.navText, item.active && { color: c.forest }]}>{item.title}</Text></Pressable>)}</View> : <View style={s.localBadge}><View style={s.dot} /><Text style={s.localText}>Farm to market</Text></View>}</View></View><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"><View style={[s.content, { padding: width < 600 ? 20 : 32 }]}>{!ready ? <ActivityIndicator size="large" color={c.forest} style={{ padding: 80 }} /> : children}{!!error && <Text accessibilityRole="alert" style={s.notice}>{error}</Text>}<View style={s.footer}><Icon name="leaf" size={16} /><Text style={s.caption}>Grow together. Trade better.</Text><Text style={s.caption}>Sample marketplace · Local data</Text></View></View></ScrollView></SafeAreaView>;
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background }, header: { borderBottomWidth: 1, borderColor: c.line, backgroundColor: c.background },
  headerInner: { width: '100%', maxWidth: 1264, alignSelf: 'center', minHeight: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, brandmark: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.forest }, brandName: { fontSize: 21, fontWeight: '800', letterSpacing: -.6, color: c.ink }, brandSub: { fontSize: 9, color: c.muted, fontWeight: '700', marginTop: 3 },
  desktopNav: { flexDirection: 'row', gap: 10 }, navItem: { flexDirection: 'row', gap: 9, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }, navActive: { backgroundColor: c.mint }, navText: { fontSize: 14, color: c.muted, fontWeight: '600' },
  localBadge: { flexDirection: 'row', gap: 6, alignItems: 'center' }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.green }, localText: { color: c.muted, fontSize: 11 },
  scroll: { flexGrow: 1 }, content: { maxWidth: 1264, width: '100%', alignSelf: 'center', gap: 20 },
  button: { minHeight: 50, backgroundColor: c.forest, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 19, flexDirection: 'row', gap: 9, justifyContent: 'center', alignItems: 'center' }, buttonText: { fontSize: 15, fontWeight: '700', color: c.white }, secondary: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6 }, sectionTitle: { fontSize: 20, color: c.ink, fontWeight: '700', flexShrink: 1, letterSpacing: -.4 }, link: { minHeight: 44, justifyContent: 'center' }, linkText: { fontSize: 13, fontWeight: '700', color: c.forest },
  card: { backgroundColor: c.white, borderRadius: 20, borderWidth: 1, borderColor: c.line, padding: 22, gap: 16 }, row: { flexDirection: 'row', gap: 12, alignItems: 'center' }, body: { fontSize: 14, color: c.muted, lineHeight: 23 }, caption: { fontSize: 12, color: c.muted }, label: { fontSize: 13, color: c.ink, fontWeight: '600' },
  iconButton: { height: 44, width: 44, borderRadius: 13, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }, notice: { padding: 15, backgroundColor: c.mint, borderRadius: 12, color: c.forest, lineHeight: 21 },
  overlay: { flex: 1, backgroundColor: '#102b2266', justifyContent: 'center', alignItems: 'center', padding: 20 }, modal: { backgroundColor: c.background, borderRadius: 24, width: '100%', maxWidth: 560, maxHeight: '85%', padding: 22, gap: 20 }, modalHead: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'space-between' },
  footer: { borderTopWidth: 1, borderColor: c.line, marginTop: 14, paddingVertical: 22, flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
});
