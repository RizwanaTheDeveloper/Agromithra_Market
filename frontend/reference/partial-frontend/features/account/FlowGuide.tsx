import { StyleSheet, Text, View } from 'react-native';
import { MarketplaceDetailPage } from '@/components/marketplace/MarketplaceDetailPage';
import { router } from 'expo-router';
import { Button, Icon } from '@/components/marketplace/UI';
import { openAccount } from '@/components/account/AccountUI';
import { useMarketplace } from '@/context/MarketplaceContext';
import guide from '@/data/flow-guide.json';
import { colors as c } from '@/theme/market';

export function GuideScreen() {
  const { profile, updateProfile } = useMarketplace();
  const language = profile.language === 'te' ? 'te' : 'en';
  const start = (role: 'buyer' | 'seller') => {
    updateProfile({ ...profile, role });
    router.replace('/');
  };

  return <>
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.headline}>{guide.headline[language]}</Text>
      <Text style={styles.lead}>{guide.intro[language]}</Text>
    </View>
    {([
      { title: guide.sellerTitle, steps: guide.sellerSteps, icon: 'leaf' },
      { title: guide.buyerTitle, steps: guide.buyerSteps, icon: 'search' },
    ] as const).map(group => <View key={group.icon} style={styles.card}>
      <View style={styles.cardHeader}>
        <Icon name={group.icon} size={23} />
        <Text accessibilityRole="header" style={styles.cardTitle}>{group.title[language]}</Text>
      </View>
      {group.steps.map((step, index) => <View key={step.title.en} style={styles.step}>
        <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{step.title[language]}</Text>
          <Text style={styles.stepBody}>{step.body[language]}</Text>
        </View>
      </View>)}
    </View>)}
    <Text style={styles.notice}>{language === 'te'
      ? 'ఇక్కడ: మీడియా మరియు డ్రాఫ్ట్ స్థానికంగా పనిచేస్తాయి. OTP, సమీక్ష మరియు వ్యాపార సేవలు నమూనా మాత్రమే. నిజమైన సేవకు సర్వర్ మరియు ధృవీకరణ అవసరం.'
      : 'Here: uploads and saved drafts work locally. OTP, reviews, seller accounts and trade services are simulated. Live operation needs a server and genuine verification.'}</Text>
    <Button title={guide.buyAction[language]} onPress={() => start('buyer')} />
    <Button title={guide.sellAction[language]} secondary onPress={() => start('seller')} />
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>{guide.qualityTitle[language]}</Text>
      {guide.qualitySteps.map((step, index) => <View key={step.title.en} style={styles.step}>
        <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{step.title[language]}</Text>
          <Text style={styles.stepBody}>{step.body[language]}</Text>
        </View>
      </View>)}
      <Button title={guide.insightsAction[language]} secondary onPress={() => openAccount('insights')} />
    </View>
  </>;
}

export function FlowGuidePage() {
  const { profile } = useMarketplace();
  return <MarketplaceDetailPage title={guide.title[profile.language === 'te' ? 'te' : 'en']}><GuideScreen /></MarketplaceDetailPage>;
}

const styles = StyleSheet.create({
  notice: { backgroundColor: '#edf5ee', borderWidth: 1, borderColor: '#deebdf', borderRadius: 15, padding: 15, color: '#45674d', fontSize: 13, lineHeight: 20 },
  intro: { gap: 10, marginBottom: 4 },
  headline: { color: c.ink, fontSize: 30, fontWeight: '800', letterSpacing: -.7 },
  lead: { color: c.muted, fontSize: 16, lineHeight: 25 },
  card: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 20, padding: 20, gap: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  cardTitle: { color: c.ink, fontSize: 22, fontWeight: '700', flex: 1 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  number: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: c.forest, fontSize: 15, fontWeight: '700' },
  stepContent: { flex: 1, gap: 5 },
  stepTitle: { color: c.ink, fontSize: 16, fontWeight: '700' },
  stepBody: { color: c.muted, fontSize: 14, lineHeight: 22 },
});
