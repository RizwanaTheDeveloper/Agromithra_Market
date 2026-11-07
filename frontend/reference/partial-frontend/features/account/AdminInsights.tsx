import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View } from 'react-native';
import { Button, s } from '@/components/marketplace/UI';
import { Choice, Field, Notice, Panel, a, openAccount } from '@/components/account/AccountUI';
import { useMarketplace } from '@/context/MarketplaceContext';
import market from '@/data/marketplace.json';
import reference from '@/data/price-reference.json';
import { money, positiveNumber } from '@/utils/account';
import { colors as c } from '@/theme/market';

export function AdminScreen() {
  const { account, updateAccount, listings } = useMarketplace();
  const [listingId, setListingId] = useState(listings[0]?.id || '');
  const listing = listings.find(item => item.id === listingId);
  return <><Panel title="Demo management console"><Notice text="Local demonstration tools, available to everyone in this prototype. These are not production administrator permissions." /><Text style={s.body}>{listings.length} sample/local listings · {account.requirements.length} buyer requirements</Text><Text style={s.body}>{account.tickets.filter(item => item.status === 'open').length} open support tickets · {account.bookings.length} bookings · {account.completedTrades.length} completed demo trades</Text></Panel>
    <Panel title="Listing moderation"><Choice label="Listing to moderate" value={listingId} options={listings.map(item => ({ value: item.id, label: item.title }))} onChange={setListingId} />{listing && <><Text style={s.body}>{listing.title} · {listing.location}</Text><Text style={a.badge}>{account.moderation[listing.id] === 'blocked' ? 'Blocked locally' : 'Visible locally'}</Text><Button title={account.moderation[listing.id] === 'blocked' ? 'Restore listing locally' : 'Block listing locally'} onPress={() => updateAccount(state => ({ ...state, moderation: { ...state.moderation, [listing.id]: state.moderation[listing.id] === 'blocked' ? 'active' : 'blocked' } }))} /><Text style={s.caption}>Local blocks remove the card from Home and from permitted sample contacts.</Text></>}</Panel>
    <Panel title="Marketplace segments">{market.categories.map(category => { const count = listings.filter(item => item.cat === category.id).length; return <View key={category.id} style={{ gap: 7 }}><Text style={s.label}>{category.name}: {count}</Text><View style={{ height: 10, borderRadius: 6, backgroundColor: c.mint, overflow: 'hidden' }}><View style={{ height: 10, width: `${Math.max(1, count / listings.length * 100)}%`, backgroundColor: c.green }} /></View></View>; })}</Panel>
    <Panel title="Support moderation">{!account.tickets.length && <Text style={s.body}>No local tickets to review.</Text>}{account.tickets.map(ticket => <View key={ticket.id} style={{ gap: 10 }}><Text style={s.label}>{ticket.subject} · {ticket.status}</Text><Text style={s.body}>{ticket.description}</Text><Button title={`${ticket.status === 'open' ? 'Resolve' : 'Reopen'} ${ticket.subject}`} secondary onPress={() => updateAccount(state => ({ ...state, tickets: state.tickets.map(item => item.id === ticket.id ? { ...item, status: item.status === 'open' ? 'resolved' : 'open' } : item) }))} /></View>)}</Panel></>;
}

export function InsightsScreen() {
  const { listing: listingId } = useLocalSearchParams<{ listing?: string }>();
  const { listings } = useMarketplace();
  const listing = listings.find(item => item.id === listingId);
  const seed = market.listings.find(item => item.image === listing?.image);
  const initialProduct = reference.products.find(item => item.seedId === listingId || item.seedId === seed?.id) || reference.products[0];
  const [productId, setProductId] = useState(initialProduct.id);
  const [district, setDistrict] = useState(reference.demoRecords.find(row => row.productId === initialProduct.id && row.district === listing?.location)?.district || reference.demoRecords.find(row => row.productId === initialProduct.id)?.district || 'Guntur');
  const [quantity, setQuantity] = useState(String(listing?.quantity || 1));
  const [costs, setCosts] = useState('0');
  const [asking, setAsking] = useState(String(listing?.price || initialProduct.demoBase));
  const [evidence, setEvidence] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    if (listingId) return;
    let cancelled = false;
    AsyncStorage.getItem('agromitra.insights-draft.v1').then(raw => {
      if (cancelled || !raw) return;
      const draft = JSON.parse(raw);
      const product = reference.products.find(item => item.id === draft.productId);
      if (!product) return;
      setProductId(product.id);
      setDistrict(reference.demoRecords.find(row => row.productId === product.id && row.district === draft.district)?.district || reference.demoRecords.find(row => row.productId === product.id)?.district || 'Guntur');
      for (const [key, set] of Object.entries({ quantity: setQuantity, costs: setCosts, asking: setAsking, evidence: setEvidence })) {
        if (typeof draft[key] === 'string') set(draft[key]);
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setDraftReady(true); });
    return () => { cancelled = true; };
  }, [listingId]);
  useEffect(() => {
    if (!listingId && draftReady) void AsyncStorage.setItem('agromitra.insights-draft.v1', JSON.stringify({ productId, district, quantity, costs, asking, evidence })).catch(() => {});
  }, [listingId, draftReady, productId, district, quantity, costs, asking, evidence]);
  const product = reference.products.find(item => item.id === productId)!;
  const rows = reference.demoRecords.filter(row => row.productId === productId && row.district === district);
  const districts = [...new Set(reference.demoRecords.filter(row => row.productId === productId).map(row => row.district))];
  const values = rows.map(row => row.modal).sort((left, right) => left - right);
  const median = values.length ? (values[Math.floor(values.length / 2)] + values[Math.ceil(values.length / 2) - 1]) / 2 : null;
  const valid = positiveNumber(quantity) && Number.isFinite(Number(costs)) && Number(costs) >= 0 && positiveNumber(asking);
  const landed = valid ? Number(asking) + Number(costs) / Number(quantity) : null;
  return <><Panel title={listing?.title || "Draft listing analysis"}><Notice text={`FICTIONAL REPLAY · ${reference.demoDate} · Not current mandi prices. These are the APK's original sample reference records.`} /><Choice label="Product and variety" value={productId} options={reference.products.map(item => ({ value: item.id, label: `${item.label} · ${item.variety}` }))} onChange={id => { const selected = reference.products.find(item => item.id === id)!; setProductId(id); setAsking(String(selected.demoBase)); setDistrict(reference.demoRecords.find(row => row.productId === id)?.district || 'Guntur'); }} /><Choice label="Reference district" value={district} options={districts} onChange={setDistrict} /><Text style={s.body}>Variety: {product.variety} · Grade: {product.grade} · Unit: {product.unit}</Text>{median !== null ? <><Text style={a.amount}>{money(median)} / {product.unit}</Text><Text style={s.caption}>Median of {rows.length} matching sample modal records, as of {reference.demoDate}.</Text></> : <Notice text="No exact sample reference matches this product and district." />}</Panel>
    <Panel title="Lot cost comparison"><Field label="Your asking price per unit (INR)" value={asking} onChange={setAsking} numeric /><Field label="Lot quantity" value={quantity} onChange={setQuantity} numeric /><Field label="Additional lot transport / handling cost (INR)" value={costs} onChange={setCosts} numeric />{landed !== null ? <><Text style={s.label}>Landed cost: {money(landed)} / {product.unit}</Text>{median !== null && <Text style={s.body}>Versus sample median: {((landed / median - 1) * 100).toFixed(1)}%</Text>}</> : <Notice error text="Enter a positive asking price and quantity, and a non-negative additional cost." />}</Panel>
    <Panel title="Buyer evidence"><Text style={s.body}>Identity, capture clarity, measured quality and animal health are separate checks. Photos cannot certify moisture, milk yield or veterinary fitness.</Text><Field label="Evidence notes for this comparison" value={evidence} onChange={setEvidence} multiline /><Text style={s.caption}>Notes are for this comparison session. No AI model or image certification is run.</Text><Button title="Arrange an independent sample check" onPress={() => openAccount('services')} /></Panel>
    <Panel title="Dated source records">{rows.map(row => <View key={row.id} style={{ gap: 6 }}><Text style={s.label}>{row.market} · {row.date}</Text><Text style={s.body}>{money(row.min)} – {money(row.max)} / {row.unit} · Modal {money(row.modal)}</Text><Text style={s.caption}>{row.sourceName} · Fictional {row.sourceKind} fixture</Text></View>)}</Panel></>;
}
