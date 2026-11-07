import { useState } from 'react';
import { Text } from 'react-native';
import { Button, s } from '@/components/marketplace/UI';
import { Actions, Choice, Empty, Field, Notice, Panel, a, openAccount } from '@/components/account/AccountUI';
import { useMarketplace } from '@/context/MarketplaceContext';
import { dateAfter, makeId } from '@/utils/account';

export function PlansScreen() {
  const { account, updateAccount } = useMarketplace();
  const eligible = account.ownListings.filter(item => item.status === 'active' && (!item.expires || item.expires >= dateAfter(0)) && account.moderation[item.id] !== 'blocked');
  const [listingId, setListingId] = useState(eligible[0]?.id || '');
  const [message, setMessage] = useState('');
  return <><Panel title="Tools for regular traders."><Text style={a.badge}>BUYER PRO · DEMO</Text><Text style={a.amount}>₹499 / month</Text>{['Saved sourcing requirements', 'Category and location alerts', 'Quote comparison and trade records'].map(text => <Text key={text} style={s.body}>• {text}</Text>)}<Text style={s.label}>{account.plan ? 'Demo plan active' : 'Basic plan'}</Text><Button title={account.plan ? 'Cancel sample plan' : 'Activate sample plan'} onPress={() => updateAccount(state => ({ ...state, plan: !state.plan }))} /><Notice text="Illustrative pricing from the APK. Activating a sample plan does not charge money or enable a paid service." /></Panel>
    <Panel title="Promote a listing"><Text style={s.body}>Illustrative ₹149 / 7 days. Promoted cards are labelled Sponsored · demo.</Text>{!eligible.length ? <Empty title="Create a listing first" body="An active, unexpired listing is needed for promotion." action="My listings" onPress={() => openAccount('manage-listings')} /> : <><Choice label="Listing to promote" value={listingId} options={eligible.map(item => ({ value: item.id, label: item.title }))} onChange={setListingId} /><Button title="Simulate promotion" disabled={!eligible.some(item => item.id === listingId)} onPress={() => { updateAccount(state => ({ ...state, ownListings: state.ownListings.map(item => item.id === listingId ? { ...item, sponsoredUntil: dateAfter(7) } : item) })); setMessage('Listing promoted locally for 7 days. No charge was made.'); }} />{eligible.filter(item => item.sponsoredUntil && item.sponsoredUntil >= dateAfter(0)).map(item => <Text key={item.id} style={s.body}>{item.title} · Sponsored until {item.sponsoredUntil}</Text>)}</>}{!!message && <Notice text={message} />}</Panel></>;
}

export function SupportScreen() {
  const { account, updateAccount } = useMarketplace();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Listing report');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  return <><Panel title="How can we help?"><Text style={s.body}>Report a listing, record a dispute or create a sample support ticket.</Text><Choice label="Support category" value={category} options={['Listing report', 'Trade dispute', 'Account help', 'App feedback']} onChange={setCategory} /><Field label="Ticket subject" value={subject} onChange={setSubject} maxLength={90} /><Field label="Describe the issue" value={description} onChange={setDescription} multiline maxLength={1000} />{!!error && <Notice error text={error} />}<Button title="Create local support ticket" onPress={() => { if (subject.trim().length < 3 || description.trim().length < 8) return setError('Enter a subject of at least 3 characters and a description of at least 8 characters.'); updateAccount(state => ({ ...state, tickets: [{ id: makeId('TICKET'), subject: subject.trim(), category, description: description.trim(), status: 'open', date: new Date().toISOString() }, ...state.tickets] })); setSubject(''); setDescription(''); setError(''); }} /><Notice text="Tickets are saved on this device. They are not sent to a support team." /></Panel>
    {!account.tickets.length && <Empty title="No support tickets" body="Your local reports and disputes will appear here." />}{account.tickets.map(item => <Panel key={item.id} title={item.subject}><Text style={a.badge}>{item.status} · {item.category}</Text><Text style={s.body}>{item.description}</Text><Text selectable style={s.caption}>{item.id} · {new Date(item.date).toLocaleString('en-IN')}</Text><Actions><Button title={item.status === 'open' ? 'Resolve ticket locally' : 'Reopen ticket'} secondary onPress={() => updateAccount(state => ({ ...state, tickets: state.tickets.map(ticket => ticket.id === item.id ? { ...ticket, status: item.status === 'open' ? 'resolved' : 'open' } : ticket) }))} /></Actions></Panel>)}</>;
}
