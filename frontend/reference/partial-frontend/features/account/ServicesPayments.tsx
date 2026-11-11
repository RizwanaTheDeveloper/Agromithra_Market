import { useState } from 'react';
import { Text } from 'react-native';
import { Button, InfoModal, s } from '@/components/marketplace/UI';
import { Actions, Choice, Empty, Field, Notice, Panel, a } from '@/components/account/AccountUI';
import { useMarketplace } from '@/context/MarketplaceContext';
import { serviceOptions } from '@/data/account';
import { Payment } from '@/types/account';
import { dateAfter, makeId, money, positiveNumber, validDate } from '@/utils/account';

export function ServicesScreen() {
  const { account, updateAccount, listings } = useMarketplace();
  const [listingId, setListingId] = useState(listings.find(item => item.id === 'L110')?.id || listings[0]?.id || '');
  const [service, setService] = useState(serviceOptions[0].name);
  const [date, setDate] = useState(dateAfter(1));
  const [error, setError] = useState('');
  const selected = serviceOptions.find(item => item.name === service)!;
  return <><Panel title="Support around the trade."><Text style={s.body}>Arrange sample quality checks, veterinary visits and transport for a lot.</Text><Choice label="Booking listing" value={listingId} options={listings.map(item => ({ value: item.id, label: item.title }))} onChange={setListingId} /><Choice label="Service type" value={service} options={serviceOptions.map(item => item.name)} onChange={setService} /><Field label="Booking date (YYYY-MM-DD)" value={date} onChange={setDate} maxLength={10} /><Text style={s.body}>{selected.provider} · Illustrative fee {money(selected.fee)}</Text>{!!error && <Notice error text={error} />}<Button title="Request demo booking" onPress={() => { if (!listings.some(item => item.id === listingId) || !validDate(date, true)) return setError('Choose a listing and a valid booking date from today onward.'); updateAccount(state => ({ ...state, bookings: [{ id: makeId('BOOK'), listingId, type: service, provider: selected.provider, fee: selected.fee, date, status: 'requested' }, ...state.bookings] })); setError(''); }} /><Notice text="No provider is contacted and no service fee is charged." /></Panel>
    {!account.bookings.length && <Empty title="No bookings yet" body="Create a sample booking above to try inspection and transport tracking." />}{account.bookings.map(item => <Panel key={item.id} title={item.type}><Text style={a.badge}>{item.status}</Text><Text style={s.body}>{listings.find(listing => listing.id === item.listingId)?.title}</Text><Text style={s.body}>{item.provider} · {item.date} · {money(item.fee)} illustrative fee</Text>{item.status === 'requested' && <Actions><Button title="Complete sample booking" onPress={() => updateAccount(state => ({ ...state, bookings: state.bookings.map(booking => booking.id === item.id ? { ...booking, status: 'completed' } : booking) }))} /><Button title="Cancel booking" secondary onPress={() => updateAccount(state => ({ ...state, bookings: state.bookings.map(booking => booking.id === item.id ? { ...booking, status: 'cancelled' } : booking) }))} /></Actions>}</Panel>)}</>;
}

export function PaymentsScreen() {
  const { account, updateAccount, listings } = useMarketplace();
  const [listingId, setListingId] = useState(listings[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('Advance');
  const [method, setMethod] = useState('UPI');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const total = account.payments.filter(item => item.listingId === listingId).reduce((sum, item) => sum + item.amount, 0);
  return <><Panel title="Demo money trail"><Notice text="Fictional records only. No bank or payment gateway is connected, and no money moves." /><Choice label="Payment listing" value={listingId} options={listings.map(item => ({ value: item.id, label: item.title }))} onChange={setListingId} /><Field label="Fictional amount (INR)" value={amount} onChange={setAmount} numeric /><Choice label="Payment kind" value={kind} options={['Advance', 'Settlement', 'Service fee']} onChange={setKind} /><Choice label="Payment method" value={method} options={['UPI', 'Bank transfer', 'Cash']} onChange={setMethod} /><Field label="Payment note" value={note} onChange={setNote} multiline />{!!error && <Notice error text={error} />}<Button title="Record fictional payment" onPress={() => { if (!positiveNumber(amount) || !listings.some(item => item.id === listingId)) return setError('Choose a listing and enter a positive amount.'); updateAccount(state => ({ ...state, payments: [{ id: makeId('PAY'), listingId, amount: Number(amount), kind, method, note: note.trim(), date: new Date().toISOString() }, ...state.payments] })); setAmount(''); setNote(''); setError(''); }} /><Text style={s.label}>Selected lot's fictional recorded payments: {money(total)}</Text><Button title={account.completedTrades.includes(listingId) ? 'Demo trade completed' : 'Mark selected demo trade complete'} secondary disabled={!total || account.completedTrades.includes(listingId)} onPress={() => updateAccount(state => ({ ...state, completedTrades: [...new Set([...state.completedTrades, listingId])] }))} /></Panel>
    {!account.payments.length && <Empty title="No payment records yet" body="Record a fictional advance or settlement to view a receipt summary." />}{account.payments.map(item => <Panel key={item.id} title={money(item.amount)}><Text style={a.badge}>DEMO · {item.kind}</Text><Text style={s.body}>{listings.find(listing => listing.id === item.listingId)?.title}</Text><Text style={s.body}>{item.method} · {new Date(item.date).toLocaleString('en-IN')}</Text><Button title="Open receipt summary" secondary onPress={() => setReceipt(item)} /></Panel>)}{receipt && <InfoModal title="Fictional receipt summary" onClose={() => setReceipt(null)}><Notice text="DEMO RECORD · Not evidence of a real payment" /><Text style={a.amount}>{money(receipt.amount)}</Text><Text style={s.body}>{listings.find(item => item.id === receipt.listingId)?.title}</Text><Text selectable style={s.body}>Reference: {receipt.id}</Text><Text style={s.body}>{receipt.kind} · {receipt.method}</Text><Text style={s.body}>{new Date(receipt.date).toLocaleString('en-IN')}</Text><Text style={s.body}>{receipt.note || 'No additional note.'}</Text></InfoModal>}</>;
}
