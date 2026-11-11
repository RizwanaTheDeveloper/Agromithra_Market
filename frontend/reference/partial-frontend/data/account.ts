import { AccountState, ContactChoices } from '@/types/account';

export const contactDefaults: ContactChoices = { sharing: true, whatsapp: true, call: true, phone: '', time: '9 am – 6 pm' };
export function createInitialAccount(): AccountState {
  return {
    verification: { status: 'unverified', phone: '', name: '', business: 'Individual', consent: false },
    contacts: {}, blockedBuyers: [], history: [], ownListings: [], requirements: [], bookings: [], payments: [], tickets: [],
    moderation: {}, completedTrades: [], plan: false,
    threads: [{ id: 'C301', party: 'Sree Dairy Farm', listingId: 'L110', messages: [{ id: 'M301', mine: false, text: 'Welcome! You can arrange a farm visit and observe milking before deciding.', time: '2026-10-02T09:00:00+05:30' }] }],
  };
}
export const serviceOptions = [
  { name: 'Veterinary assessment', provider: 'Demo veterinary team', fee: 800 },
  { name: 'Crop quality check', provider: 'Demo quality lab', fee: 500 },
  { name: 'Farm visit', provider: 'Demo farm coordinator', fee: 0 },
  { name: 'Goods transport', provider: 'Demo transport partner', fee: 1500 },
  { name: 'Livestock transport', provider: 'Demo livestock carrier', fee: 2500 },
  { name: 'Chilled transport', provider: 'Demo cold-chain partner', fee: 2000 },
];
export const guideSteps = [
  { title: 'Seller: upload and check', body: 'Choose a category. Add a clear description, quantity and asking price. Inspect quality evidence before posting.', section: 'manage-listings', action: 'Create a listing' },
  { title: 'Seller: compare and set a price', body: 'Match product, variety, grade and unit. Compare dated area references and include lot transport costs.', section: 'insights', action: 'Compare sample prices' },
  { title: 'Buyer: review the report', body: 'Review seller declarations separately from independent crop testing or veterinary assessment.', section: 'services', action: 'Arrange a sample inspection' },
  { title: 'Buyer: verify and contact', body: 'Complete the simulated buyer review, respect contact permissions, and record an enquiry. Agree terms and pickup directly.', section: 'verification', action: 'Open buyer verification' },
];
