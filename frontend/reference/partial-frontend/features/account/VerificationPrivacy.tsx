import { useState } from 'react';
import { Text } from 'react-native';
import { Button, s } from '@/components/marketplace/UI';
import { Choice, Empty, Field, Notice, Panel, Toggle, openAccount } from '@/components/account/AccountUI';
import { useMarketplace } from '@/context/MarketplaceContext';
import { businessTypes } from '@/data/profile';
import { contactDefaults } from '@/data/account';
import { dateAfter, makeId } from '@/utils/account';

export function VerificationScreen() {
  const { account, updateAccount, profile } = useMarketplace();
  const current = account.verification;
  const [name, setName] = useState(current.name || profile.name);
  const [phone, setPhone] = useState(current.phone);
  const [business, setBusiness] = useState(current.business);
  const [consent, setConsent] = useState(current.consent);
  const [error, setError] = useState('');
  return <><Panel title="Know who is buying."><Text style={s.body}>One buyer profile works for every category. Use fictional buyer details and a test number.</Text><Notice text="Simulated verification only. No OTP is sent and no identity is verified." /><Text style={s.label}>Status: {current.status === 'approved' ? 'Verified buyer · demo' : current.status === 'pending' ? 'Review pending · demo' : 'Buyer not verified'}</Text>
    <Field label="Buyer / business name" value={name} onChange={setName} maxLength={60} /><Field label="Test mobile number" value={phone} onChange={setPhone} phone maxLength={20} /><Choice label="Business type" value={business} options={businessTypes} onChange={setBusiness} /><Toggle label="I understand this is a fictional local buyer review" value={consent} onChange={setConsent} />
    {!!error && <Notice error text={error} />}<Button title="Submit demo buyer review" onPress={() => { if (name.trim().length < 2 || !/^\d{10}$/.test(phone.replace(/[\s-]/g, '')) || !consent) { setError('Enter a name, a 10-digit test number, and accept the demo notice.'); return; } setError(''); updateAccount(state => ({ ...state, verification: { name: name.trim(), phone: phone.replace(/[\s-]/g, ''), business, consent, status: 'pending' } })); }} />
    {current.status === 'pending' && <Button title="Simulate successful buyer review" onPress={() => updateAccount(state => ({ ...state, verification: { ...state.verification, status: 'approved' } }))} />}
    {current.status !== 'unverified' && <Button title="Reset buyer verification" secondary onPress={() => updateAccount(state => ({ ...state, verification: { ...state.verification, status: 'unverified' } }))} />}
  </Panel>{current.status === 'approved' && <Button title="Open contact history" onPress={() => openAccount('contact-history')} />}</>;
}

export function PrivacyScreen() {
  const { account, updateAccount } = useMarketplace();
  const [listingId, setListingId] = useState(account.ownListings[0]?.id || '');
  const [buyer, setBuyer] = useState('');
  const [message, setMessage] = useState('');
  const selected = account.ownListings.find(item => item.id === listingId);
  const choices = { ...contactDefaults, ...account.contacts[listingId] };
  const change = (value: Partial<typeof choices>) => { updateAccount(state => ({ ...state, contacts: { ...state.contacts, [listingId]: { ...contactDefaults, ...state.contacts[listingId], ...value } } })); setMessage('Contact choices saved on this device.'); };
  return <><Panel title="Keep control of your number."><Text style={s.body}>Choose contact permissions for each listing. These controls affect local sample enquiries.</Text><Notice text="Local prototype permissions only. A production server must withhold contact data and enforce buyer verification and blocks." /></Panel>
    {!account.ownListings.length ? <Empty title="No listings yet" body="Create a listing to set its contact controls." action="Create a listing" onPress={() => openAccount('manage-listings')} /> : <Panel title="Listing contact choices"><Choice label="Your listing" value={listingId} options={account.ownListings.map(item => ({ value: item.id, label: item.title }))} onChange={id => { setListingId(id); setMessage(''); }} />{selected && <><Toggle label="Allow approved demo buyers to contact me" value={choices.sharing} onChange={sharing => change({ sharing })} /><Toggle label="Allow WhatsApp" value={choices.whatsapp} onChange={whatsapp => change({ whatsapp })} /><Toggle label="Allow phone calls" value={choices.call} onChange={call => change({ call })} /><Field label="Test contact number" value={choices.phone} onChange={phone => change({ phone })} phone maxLength={20} /><Choice label="Preferred contact time" value={choices.time} options={['9 am – 6 pm', '6 am – 10 am', '4 pm – 8 pm', 'Any time']} onChange={time => change({ time })} /></>}{!!message && <Notice text={message} />}</Panel>}
    <Panel title="Blocked demo buyers"><Field label="Demo buyer ID to block" value={buyer} onChange={setBuyer} maxLength={60} /><Button title="Block demo buyer" disabled={!buyer.trim()} onPress={() => { const id = buyer.trim(); updateAccount(state => ({ ...state, blockedBuyers: [...new Set([...state.blockedBuyers, id])] })); setBuyer(''); }} />{!account.blockedBuyers.length && <Text style={s.body}>No blocked buyers.</Text>}{account.blockedBuyers.map(id => <Button key={id} title={`Unblock ${id}`} secondary onPress={() => updateAccount(state => ({ ...state, blockedBuyers: state.blockedBuyers.filter(buyerId => buyerId !== id) }))} />)}</Panel></>;
}

export function ContactHistoryScreen() {
  const { account, updateAccount, listings, profile } = useMarketplace();
  const available = listings.filter(item => (!item.status || item.status === 'active') && (!item.expires || item.expires >= dateAfter(0)) && account.moderation[item.id] !== 'blocked');
  const [listingId, setListingId] = useState(available[0]?.id || '');
  const [channel, setChannel] = useState('WhatsApp');
  const [buyerId, setBuyerId] = useState('DEMO-BUYER');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return <><Panel title="Your recent enquiries"><Text style={s.body}>Only approved demo buyers can record a permitted sample contact. No phone app or WhatsApp message is opened.</Text><Choice label="Listing" value={listingId} options={available.map(item => ({ value: item.id, label: item.title }))} onChange={setListingId} /><Choice label="Contact channel" value={channel} options={['WhatsApp', 'Call']} onChange={setChannel} /><Field label="Demo buyer ID" value={buyerId} onChange={setBuyerId} maxLength={60} />
    {!!error && <Notice error text={error} />}{!!message && <Notice text={message} />}<Button title="Record sample enquiry" onPress={() => { setError(''); setMessage(''); const listing = available.find(item => item.id === listingId); const choices = { ...contactDefaults, ...account.contacts[listingId] }; if (account.verification.status !== 'approved') return setError('Complete demo buyer verification first.'); if (!listing || !buyerId.trim()) return setError('Choose a listing and enter a demo buyer ID.'); if (account.blockedBuyers.includes(buyerId.trim())) return setError('This demo buyer is blocked.'); if (!choices.sharing || (channel === 'WhatsApp' ? !choices.whatsapp : !choices.call)) return setError('The seller has disabled this contact channel.'); updateAccount(state => ({ ...state, history: [{ id: makeId('CONTACT'), listingId, title: listing.title, buyer: `${profile.name} (${buyerId.trim()})`, channel: channel as 'WhatsApp' | 'Call', date: new Date().toISOString() }, ...state.history] })); setMessage('Sample enquiry recorded. No seller was contacted.'); }} />{account.verification.status !== 'approved' && <Button title="Open buyer verification" secondary onPress={() => openAccount('verification')} />}</Panel>
    {!account.history.length && <Empty title="No contacts unlocked yet" body="Your recorded WhatsApp and call enquiries will appear here." />}{account.history.map(item => <Panel key={item.id} title={item.title}><Text style={s.label}>{item.channel} · demo</Text><Text style={s.body}>{item.buyer} · {new Date(item.date).toLocaleString('en-IN')}</Text><Button title="Remove history entry" secondary onPress={() => updateAccount(state => ({ ...state, history: state.history.filter(event => event.id !== item.id) }))} /></Panel>)}</>;
}
