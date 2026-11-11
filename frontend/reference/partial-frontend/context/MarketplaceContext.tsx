import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { defaultProfile, Profile } from '@/data/profile';
import { AccountState, MarketListing } from '@/types/account';
import { createInitialAccount } from '@/data/account';
import { restoreAccount } from '@/utils/account';
import market from '@/data/marketplace.json';

type Store = { profile: Profile; saved: string[]; ready: boolean; error: string; account: AccountState; listings: MarketListing[]; updateAccount: (update: (state: AccountState) => AccountState) => void; updateProfile: (p: Profile) => void; toggleSaved: (id: string) => void; reset: () => void };
const Context = createContext<Store | null>(null);
const key = 'agromitra.home-profile.v1';
export function MarketplaceProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState(defaultProfile);
  const [saved, setSaved] = useState<string[]>([]);
  const [account, setAccount] = useState<AccountState>(createInitialAccount);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { AsyncStorage.getItem(key).then(raw => {
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.profile?.name === 'string' && typeof data.profile?.city === 'string') {
      setProfile({ ...defaultProfile, ...data.profile });
    }
    if (Array.isArray(data.saved)) setSaved(data.saved.filter((id: unknown) => typeof id === 'string'));
    setAccount(restoreAccount(data.account));
  }).catch(() => setError('Saved preferences could not be loaded.')).finally(() => setReady(true)); }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(key, JSON.stringify({ profile, saved, account })).then(() => setError('')).catch(() => setError('Changes are available for this session, but could not be saved on this device.')); }, [profile, saved, account, ready]);
  return <Context.Provider value={{ profile, saved, ready, error, account, listings: [...account.ownListings, ...market.listings], updateAccount: setAccount, updateProfile: setProfile, toggleSaved: id => setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]), reset: () => { setProfile(defaultProfile); setSaved([]); setAccount(createInitialAccount()); } }}>{children}</Context.Provider>;
}
export function useMarketplace() { const value = useContext(Context); if (!value) throw new Error('MarketplaceProvider is required'); return value; }
