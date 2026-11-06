import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { Heading } from '@/components/ui/Heading';
import { api } from '@/services/api';
export default function Home() {
 const [status, setStatus] = useState('Checking backend connection...');
 useEffect(() => { let active=true;
  api.get<{status:string}>('/health').then(r => {if(active)setStatus(`Backend: ${r.data.status}`)})
    .catch(() => {if(active)setStatus('Backend unavailable — check API URL and network')});
  return () => {active=false};
 }, []);
 return <Screen><Heading title="Agromitra Market" subtitle="Buy, sell and understand your market"/><Text>{status}</Text><Text>Starter build — marketplace data and authentication not yet connected.</Text></Screen>;
}
