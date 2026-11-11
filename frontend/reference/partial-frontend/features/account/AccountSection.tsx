import { ComponentType } from 'react';
import { router } from 'expo-router';
import { AccountPage, Empty, Notice, Panel, openAccount } from '@/components/account/AccountUI';
import { Button } from '@/components/marketplace/UI';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { useMarketplace } from '@/context/MarketplaceContext';
import menus from '@/data/account-menu.json';
import { ContactHistoryScreen, PrivacyScreen, VerificationScreen } from './VerificationPrivacy';
import { ListingsScreen, SavedScreen } from './Listings';
import { RequirementsScreen } from './Requirements';
import { MessagesScreen } from './Messages';
import { PaymentsScreen, ServicesScreen } from './ServicesPayments';
import { PlansScreen, SupportScreen } from './PlansSupport';
import { AdminScreen, InsightsScreen } from './AdminInsights';
import { FlowGuidePage } from './FlowGuide';
import { InsightsHome } from './InsightsHome';

function ProfileSettings() {
  const { profile, updateProfile } = useMarketplace();
  return <Panel><ProfileEditor profile={profile} onSave={updated => { updateProfile(updated); router.replace('/profile'); }} onReset={() => openAccount('reset')} onVerification={() => openAccount('verification')} /></Panel>;
}
function ResetScreen() {
  const { reset } = useMarketplace();
  return <Panel title="Reset all demo data?"><Notice text="This clears your local listings, messages, verification, permissions, bookings, payment records, support tickets and saved items. The APK's default sample data and profile will be restored." /><Button title="Keep my data" secondary onPress={() => router.replace('/profile')} /><Button title="Reset all demo data" onPress={() => { reset(); router.replace('/profile'); }} /></Panel>;
}
const screens: Record<string, ComponentType> = {
  verification: VerificationScreen, 'contact-privacy': PrivacyScreen, 'contact-history': ContactHistoryScreen,
  profile: ProfileSettings, 'manage-listings': ListingsScreen, saved: SavedScreen,
  'my-requests': RequirementsScreen, inbox: MessagesScreen, services: ServicesScreen, plans: PlansScreen,
  payments: PaymentsScreen, support: SupportScreen, admin: AdminScreen, 'insight-analysis': InsightsScreen, reset: ResetScreen,
};
export function AccountSection({ section }: { section: string }) {
  const { profile } = useMarketplace();
  if (section === 'flow-guide') return <FlowGuidePage />;
  if (section === 'insights') return <InsightsHome />;
  const menu = [...menus.trust, ...menus.account].find(item => item.id === section);
  const title = menu ? profile.language === 'te' ? menu.titleTe : menu.title : section === 'insight-analysis' ? 'Listing analysis' : section === 'reset' ? 'Data controls' : 'Account';
  const Screen = screens[section];
  return <AccountPage title={title}>{Screen ? <Screen /> : <Empty title="Section not found" body="Choose an available account section from Profile." action="Open Profile" onPress={() => router.replace('/profile')} />}</AccountPage>;
}
