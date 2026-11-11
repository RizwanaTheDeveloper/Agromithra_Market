export type Profile = { name: string; business: string; city: string; language: 'en' | 'te'; role: 'buyer' | 'seller' };
export const defaultProfile: Profile = { name: 'Demo Buyer', business: 'Individual', city: 'Guntur', language: 'en', role: 'buyer' };
export const cities = ['Guntur', 'Mangalagiri', 'Vijayawada', 'Tenali', 'Ongole', 'Nellore', 'Nuzvid', 'Bhimavaram', 'Khammam'];
export const businessTypes = ['Individual', 'Farmer', 'FPO', 'Trader', 'Miller', 'Processor', 'Dairy farmer', 'Poultry farmer', 'Aqua farmer'];
