import market from '@/data/marketplace.json';

export type MarketListing = typeof market.listings[number] & { own?: boolean; status?: 'active' | 'paused' | 'sold'; expires?: string; sponsoredUntil?: string };
export type ContactChoices = { sharing: boolean; whatsapp: boolean; call: boolean; phone: string; time: string };
export type Verification = { status: 'unverified' | 'pending' | 'approved'; phone: string; name: string; business: string; consent: boolean };
export type Requirement = { id: string; title: string; cat: string; quantity: number; unit: string; budget: number; location: string; note: string; expires: string; status: 'open' | 'closed'; quote?: number };
export type Message = { id: string; mine: boolean; text: string; time: string };
export type Thread = { id: string; party: string; listingId: string; messages: Message[] };
export type Booking = { id: string; listingId: string; type: string; date: string; provider: string; fee: number; status: 'requested' | 'completed' | 'cancelled' };
export type Payment = { id: string; listingId: string; amount: number; kind: string; method: string; date: string; note: string };
export type Ticket = { id: string; subject: string; category: string; description: string; status: 'open' | 'resolved'; date: string };
export type ContactEvent = { id: string; listingId: string; title: string; buyer: string; channel: 'WhatsApp' | 'Call'; date: string };
export type AccountState = {
  verification: Verification; contacts: Record<string, ContactChoices>; blockedBuyers: string[]; history: ContactEvent[];
  ownListings: MarketListing[]; requirements: Requirement[]; threads: Thread[]; bookings: Booking[];
  plan: boolean; payments: Payment[]; tickets: Ticket[]; moderation: Record<string, 'active' | 'blocked'>; completedTrades: string[];
};
