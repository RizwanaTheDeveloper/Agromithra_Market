import { useLocalSearchParams } from 'expo-router';
import { AccountSection } from '@/features/account/AccountSection';
import menus from '@/data/account-menu.json';

export function generateStaticParams() {
  return [...menus.trust, ...menus.account, { id: 'insights' }, { id: 'insight-analysis' }, { id: 'reset' }].map(item => ({ section: item.id }));
}

export default function AccountRoute() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return <AccountSection key={section} section={section || ''} />;
}
