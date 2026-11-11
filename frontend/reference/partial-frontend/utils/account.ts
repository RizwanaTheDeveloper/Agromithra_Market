import { AccountState } from '@/types/account';
import { createInitialAccount } from '@/data/account';

export const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export function dateAfter(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const positiveNumber = (value: string) => Number.isFinite(Number(value)) && Number(value) > 0;
export function validDate(value: string, future = false) { const date = new Date(`${value}T12:00:00`); return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10)) && (!future || value >= dateAfter(0)); }
export function restoreAccount(value: unknown): AccountState {
  const initial = createInitialAccount();
  if (!value || typeof value !== 'object') return initial;
  const saved = value as Partial<AccountState>;
  for (const key of ['ownListings', 'requirements', 'threads', 'bookings', 'payments', 'tickets', 'history', 'blockedBuyers', 'completedTrades'] as const) {
    if (Array.isArray(saved[key])) Object.assign(initial, { [key]: saved[key] });
  }
  if (saved.verification && ['unverified', 'pending', 'approved'].includes(saved.verification.status)) initial.verification = { ...initial.verification, ...saved.verification };
  if (saved.contacts && typeof saved.contacts === 'object' && !Array.isArray(saved.contacts)) initial.contacts = saved.contacts;
  if (saved.moderation && typeof saved.moderation === 'object' && !Array.isArray(saved.moderation)) initial.moderation = saved.moderation;
  initial.plan = saved.plan === true;
  return initial;
}
