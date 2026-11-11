import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, s } from '@/components/marketplace/UI';
import { Choice, Field, Notice, Panel } from '@/components/account/AccountUI';
import { useMarketplace } from '@/context/MarketplaceContext';
import market from '@/data/marketplace.json';
import { makeId } from '@/utils/account';
import { colors as c } from '@/theme/market';

export function MessagesScreen() {
  const { account, updateAccount, listings } = useMarketplace();
  const [threadId, setThreadId] = useState(account.threads[0]?.id || '');
  const [listingId, setListingId] = useState(listings[0]?.id || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const thread = account.threads.find(item => item.id === threadId);
  return <><Panel title="Trade conversations"><Text style={s.body}>Enquiries and clearly labelled sample replies stay on this device.</Text><Choice label="Conversation" value={threadId} options={account.threads.map(item => ({ value: item.id, label: item.party }))} onChange={setThreadId} /><Choice label="Listing to enquire about" value={listingId} options={listings.map(item => ({ value: item.id, label: item.title }))} onChange={setListingId} /><Button title="Start sample conversation" secondary onPress={() => { const listing = listings.find(item => item.id === listingId); if (!listing) return; const existing = account.threads.find(item => item.listingId === listingId); if (existing) { setThreadId(existing.id); return; } const id = makeId('CHAT'); const party = market.sellers.find(seller => seller.id === listing.seller)?.name || 'Demo buyer enquiry'; updateAccount(state => ({ ...state, threads: [...state.threads, { id, party, listingId, messages: [] }] })); setThreadId(id); }} /></Panel>
    {thread && <Panel title={thread.party}><Text style={s.caption}>{listings.find(item => item.id === thread.listingId)?.title}</Text>{!thread.messages.length && <Text style={s.body}>Start an enquiry below.</Text>}{thread.messages.map(item => <View key={item.id} style={{ padding: 14, borderRadius: 16, gap: 8, backgroundColor: item.mine ? c.forest : c.mint, alignSelf: item.mine ? 'flex-end' : 'flex-start', maxWidth: '90%' }}><Text style={{ color: item.mine ? c.white : c.ink, fontSize: 15, lineHeight: 23 }}>{item.text}</Text><Text style={{ color: item.mine ? '#d4e5d8' : c.muted, fontSize: 10 }}>{item.mine ? 'You' : 'Sample reply'} · {new Date(item.time).toLocaleString('en-IN')}</Text></View>)}<Field label="Your message" value={message} onChange={setMessage} multiline maxLength={800} />{!!error && <Notice error text={error} />}<Button title="Send local demo message" disabled={!message.trim()} onPress={() => { if (!message.trim()) return setError('Enter a message.'); const text = message.trim(); updateAccount(state => ({ ...state, threads: state.threads.map(item => item.id === thread.id ? { ...item, messages: [...item.messages, { id: makeId('MSG'), mine: true, text, time: new Date().toISOString() }, { id: makeId('MSG'), mine: false, text: 'Sample reply: Thank you for your enquiry. Confirm availability, inspection and collection terms before deciding.', time: new Date().toISOString() }] } : item) })); setMessage(''); setError(''); }} /><Notice text="Messages are not sent to real people. Replies are generated from local sample copy." /></Panel>}</>;
}
