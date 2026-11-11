import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Icon, s } from '@/components/marketplace/UI';
import { businessTypes, cities, Profile } from '@/data/profile';
import { colors as c } from '@/theme/market';
import { useMarketplace } from '@/context/MarketplaceContext';

export function ProfileEditor({ profile, onSave, onReset, onVerification }: { profile: Profile; onSave: (profile: Profile) => void; onReset: () => void; onVerification: () => void }) {
  const { account } = useMarketplace();
  const [draft, setDraft] = useState(profile);
  const [choice, setChoice] = useState<'business' | 'city' | 'language' | null>(null);
  const [error, setError] = useState('');
  const t = (en: string, te: string) => profile.language === 'te' ? te : en;
  if (choice) {
    const options = choice === 'business' ? businessTypes.map(value => ({ label: value, value })) : choice === 'city' ? cities.map(value => ({ label: value, value })) : [{ label: 'English', value: 'en' }, { label: 'తెలుగు', value: 'te' }];
    return <View style={styles.form}><Button title={t('Back to profile', 'ప్రొఫైల్‌కు తిరిగి')} icon="back" secondary onPress={() => setChoice(null)} />{options.map(option => <Button key={option.value} title={option.label} secondary={draft[choice] !== option.value} onPress={() => { setDraft(current => ({ ...current, [choice]: option.value })); setChoice(null); }} />)}</View>;
  }
  return <View style={styles.form}>
    <Text accessibilityRole="header" style={styles.heading}>{t('Make it yours.', 'మీ ప్రొఫైల్ మార్చండి.')}</Text>
    <View style={styles.field}><Text style={styles.label}>{t('Name / business name', 'పేరు / వ్యాపార పేరు')}</Text><TextInput accessibilityLabel="Name or business name" value={draft.name} onChangeText={name => { setDraft(current => ({ ...current, name })); setError(''); }} maxLength={60} autoComplete="name" style={styles.input} /></View>
    {([{ key: 'business', label: t('Business type', 'వ్యాపార రకం'), value: draft.business }, { key: 'city', label: t('Demo location', 'నమూనా ప్రాంతం'), value: draft.city }, { key: 'language', label: t('Interface language', 'ఇంటర్‌ఫేస్ భాష'), value: draft.language === 'te' ? 'తెలుగు' : 'English' }] as const).map(field => <View key={field.key} style={styles.field}><Text style={styles.label}>{field.label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${field.label}: ${field.value}`} onPress={() => setChoice(field.key)} style={[styles.input, s.row, { justifyContent: 'space-between' }]}><Text style={styles.value}>{field.value}</Text><Icon name="chevron" size={17} /></Pressable></View>)}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Button title={t('Save profile', 'ప్రొఫైల్ సేవ్ చేయండి')} onPress={() => { if (draft.name.trim().length < 2) { setError(t('Enter at least 2 characters for your name.', 'పేరు కనీసం 2 అక్షరాలు ఉండాలి.')); return; } onSave({ ...draft, name: draft.name.trim() }); }} />
    <View style={styles.card}><Text style={styles.cardTitle}>{t('Buyer verification', 'కొనుగోలుదారు ధృవీకరణ')}</Text><Text style={s.body}>{account.verification.status === 'approved' ? t('Verified buyer · demo', 'ధృవీకరించిన కొనుగోలుదారు · నమూనా') : account.verification.status === 'pending' ? t('Review pending · demo', 'సమీక్ష పెండింగ్ · నమూనా') : t('Buyer not verified', 'కొనుగోలుదారు ధృవీకరించబడలేదు')}</Text><Button title={t('Manage buyer verification', 'కొనుగోలుదారు ధృవీకరణ మార్చండి')} secondary onPress={onVerification} /></View>
    <View style={styles.card}><Text style={styles.cardTitle}>{t('Data controls', 'డేటా నియంత్రణ')}</Text><Text style={s.body}>{t('Profile and saved listings persist on this device. Reset restores the original demo dataset.', 'ప్రొఫైల్ మరియు సేవ్ చేసిన లిస్టింగ్‌లు ఈ పరికరంలో ఉంటాయి. రీసెట్ చేస్తే తొలి నమూనా డేటా వస్తుంది.')}</Text><Pressable accessibilityRole="button" onPress={onReset} style={s.link}><Text style={s.linkText}>{t('Reset all demo data', 'నమూనా డేటా రీసెట్ చేయండి')}</Text></Pressable></View>
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: 18 }, heading: { fontSize: 30, fontWeight: '700', letterSpacing: -.6, color: c.ink }, field: { gap: 7 }, label: { color: c.ink, fontSize: 15, fontWeight: '700' }, value: { color: c.ink, fontSize: 17 }, input: { minHeight: 53, borderWidth: 1, borderColor: '#d3dfd5', borderRadius: 12, backgroundColor: c.white, color: c.ink, fontSize: 17, padding: 13 }, card: { borderRadius: 18, padding: 18, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, gap: 12 }, cardTitle: { fontSize: 18, fontWeight: '700', color: c.ink }, error: { color: '#a43434', fontSize: 13 },
});
