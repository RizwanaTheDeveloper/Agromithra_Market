import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Art, Button, Icon, InfoModal, s } from '@/components/marketplace/UI';
import { MarketplaceDetailPage } from '@/components/marketplace/MarketplaceDetailPage';
import { Choice } from '@/components/account/AccountUI';
import { useMarketplace } from '@/context/MarketplaceContext';
import reference from '@/data/price-reference.json';
import { dateAfter, money } from '@/utils/account';
import { colors as c } from '@/theme/market';

export function InsightsHome() {
  const { profile, listings, account } = useMarketplace();
  const te = profile.language === 'te';
  const t = (en: string, telugu: string) => te ? telugu : en;
  const [modal, setModal] = useState<'data' | 'board' | null>(null);
  const districts = [...new Set(reference.demoRecords.map(row => row.district))];
  const [district, setDistrict] = useState(districts[0]);
  const active = listings.filter(item => (!item.status || item.status === 'active') && (!item.expires || item.expires >= dateAfter(0)) && account.moderation[item.id] !== 'blocked');
  const own = listings.filter(item => item.own && account.moderation[item.id] !== 'blocked');
  const choices = [...own, ...active.filter(item => !item.own).slice(0, 5)].slice(0, 8);
  const analyse = (listing?: string) => router.push({ pathname: '/account/[section]', params: { section: 'insight-analysis', ...(listing ? { listing } : {}) } });

  return <MarketplaceDetailPage title={t('AI & market insights', 'AI & మార్కెట్ వివరాలు')}>
    <View style={styles.hero}>
      <View style={styles.symbol}><Icon name="chart" size={26} /></View>
      <Text accessibilityRole="header" style={styles.headline}>{t('Know the evidence.\nCompare the price.', 'ఆధారాలు తెలుసుకోండి.\nధరలు పోల్చండి.')}</Text>
      <Text style={styles.description}>{t('Photo/video readiness, area reference prices and buyer quality checks.', 'ఫోటో/వీడియో, ప్రాంతీయ ధరలు మరియు కొనుగోలుదారు నాణ్యత వివరాలు.')}</Text>
    </View>
    <View style={styles.status}>
      <Text style={styles.statusTitle}>{t('AI vision model: not connected', 'AI విజన్ మోడల్: అనుసంధానం లేదు')}</Text>
      <Text style={styles.statusBody}>{t('Local sample comparisons work. Visual AI examples are labelled demos. No product quality is certified from an upload.', 'స్థానిక మీడియా తనిఖీ పనిచేస్తుంది. AI వివరాలు నమూనాలు. ఫోటోలతో నాణ్యత ధృవీకరించము.')}</Text>
    </View>
    <View style={styles.status}>
      <Text style={styles.statusTitle}>{t('FICTIONAL REPLAY · 2 Oct 2026 · not current mandi prices', 'కల్పిత నమూనా · 2 అక్టోబర్ 2026 · నేటి మండి ధరలు కావు')}</Text>
      <Text style={styles.statusBody}>{t('Automatic live mandi sync is not configured. Review sample records or open the official sources.', 'లైవ్ మండి అనుసంధానం లేదు. తేదీలతో CSV/JSON దిగుమతి చేయండి లేదా అధికారిక మూలాలు చూడండి.')}</Text>
      <View style={styles.buttons}>
        <View style={styles.half}><Button title={t('Market data', 'మార్కెట్ డేటా')} secondary onPress={() => setModal('data')} /></View>
        <View style={styles.half}><Button title={t('Area price board', 'ప్రాంతీయ ధరల పట్టిక')} secondary onPress={() => setModal('board')} /></View>
      </View>
    </View>
    <Text accessibilityRole="header" style={styles.sectionTitle}>{t('Analyse a listing', 'లిస్టింగ్ విశ్లేషణ')}</Text>
    <Button title={t('Continue my draft analysis', 'నా డ్రాఫ్ట్ విశ్లేషణ')} secondary onPress={() => analyse()} />
    <View style={styles.list}>
      {choices.map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={te ? item.te : item.title} onPress={() => analyse(item.id)} style={[styles.listing, index !== choices.length - 1 && styles.divider]}>
        <View style={styles.art}><Art name={item.image} width={56} height={56} /></View>
        <View style={styles.listingContent}>
          <Text style={styles.listingTitle}>{te ? item.te : item.title}</Text>
          <Text style={styles.listingMeta}>{money(item.price)} / {item.unit} · {item.location}</Text>
        </View>
        <Icon name="chevron" size={16} />
      </Pressable>)}
      {!choices.length && <Text style={s.body}>{t('No listings available. Create a new listing to begin.', 'కొత్త లిస్టింగ్ సృష్టించి ప్రారంభించండి.')}</Text>}
    </View>
    <Button title={t('Create a new listing', 'కొత్త లిస్టింగ్ సృష్టించండి')} onPress={() => router.push({ pathname: '/account/[section]', params: { section: 'manage-listings', create: '1' } })} />
    {modal && <InfoModal title={modal === 'data' ? t('Market data', 'మార్కెట్ డేటా') : t('Area price board', 'ప్రాంతీయ ధరల పట్టిక')} onClose={() => setModal(null)}>
      <Text style={styles.statusBody}>{t('FICTIONAL REPLAY · 2 Oct 2026 · not current mandi prices', 'కల్పిత నమూనా · 2 అక్టోబర్ 2026 · నేటి మండి ధరలు కావు')}</Text>
      {modal === 'data' ? <>
        <Text style={s.body}>{t('The app currently uses bundled sample records. Live sync and CSV/JSON import are not connected in this version. Open a source below to check its published data.', 'ప్రస్తుతం నమూనా రికార్డులు వాడుతున్నాము. ఈ వెర్షన్‌లో లైవ్ డేటా, CSV/JSON దిగుమతి అనుసంధానం లేదు.')}</Text>
        {reference.sources.map(source => <View key={source.id} style={{ gap: 8 }}><Text style={s.body}>{source.note}</Text><Button title={source.name} secondary onPress={() => { void Linking.openURL(source.url); }} /></View>)}
      </> : <>
        <Choice label={t('Reference district', 'ప్రాంతం')} value={district} options={districts} onChange={setDistrict} />
        {reference.products.map(product => {
          const rows = reference.demoRecords.filter(row => row.productId === product.id && row.district === district);
          if (!rows.length) return null;
          const values = rows.map(row => row.modal).sort((a, b) => a - b);
          const median = (values[Math.floor(values.length / 2)] + values[Math.ceil(values.length / 2) - 1]) / 2;
          return <View key={product.id} style={styles.boardRow}><Text style={styles.listingTitle}>{te ? product.te : product.label}</Text><Text style={s.body}>{money(median)} / {product.unit}</Text><Text style={s.caption}>{rows.length} sample records · {reference.demoDate}</Text></View>;
        })}
      </>}
    </InfoModal>}
  </MarketplaceDetailPage>;
}

const styles = StyleSheet.create({
  hero: { gap: 18, paddingTop: 16, paddingBottom: 18 },
  symbol: { width: 54, height: 54, backgroundColor: c.mint, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headline: { color: c.ink, fontSize: 30, fontWeight: '700', lineHeight: 37, letterSpacing: -.6 },
  description: { color: c.muted, fontSize: 15, lineHeight: 24 },
  status: { backgroundColor: '#f3f6eb', borderWidth: 1, borderColor: '#e1e8d4', borderRadius: 20, padding: 15, gap: 9 },
  statusTitle: { color: c.ink, fontSize: 14, fontWeight: '700', lineHeight: 21 },
  statusBody: { color: c.muted, fontSize: 13, lineHeight: 21 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 9 },
  half: { flex: 1, minWidth: 130 },
  sectionTitle: { color: c.ink, fontSize: 19, fontWeight: '700', marginTop: 8 },
  list: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 12 },
  listing: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, minHeight: 84 },
  divider: { borderBottomWidth: 1, borderBottomColor: c.line },
  art: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', backgroundColor: '#eff4e9' },
  listingContent: { flex: 1, gap: 7 },
  listingTitle: { color: c.ink, fontSize: 14, fontWeight: '700' },
  listingMeta: { color: c.muted, fontSize: 12, lineHeight: 18 },
  boardRow: { gap: 5, borderBottomWidth: 1, borderColor: c.line, paddingBottom: 12 },
});
