import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Category, DealStage, Unit } from '@prisma/client';

const units: Record<Category, Unit[]> = {
  crops: ['kg', 'quintal', 'tonne'], produce: ['kg', 'quintal', 'tonne'],
  cattle: ['animal'], smallstock: ['animal'], poultry: ['bird', 'kg'],
  eggs: ['egg', 'tray30'], aqua: ['kg', 'tonne', 'fish'], dairy: ['litre', 'kg'],
};
export function checkUnit(category: Category, unit: Unit): void {
  if (!units[category].includes(unit)) throw new BadRequestException('Unit does not match category');
}
export function checkQuantity(unit: Unit, quantity: number): void {
  if (['animal', 'bird', 'egg', 'tray30', 'fish'].includes(unit) && !Number.isInteger(quantity))
    throw new BadRequestException('Count units require whole quantities');
}
export function checkExpiry(value: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date <= new Date() || date.getTime() > Date.now() + 90 * 86400000)
    throw new BadRequestException('Expiry must be in the next 90 days');
  return date;
}
export function checkTransition(current: DealStage, next: DealStage, isSeller: boolean): void {
  const allowed: Record<DealStage, DealStage[]> = {
    quote: ['inspection', 'agreed', 'cancelled'], inspection: ['agreed', 'cancelled'],
    agreed: ['dispatched', 'cancelled'], dispatched: ['completed'], completed: [], cancelled: [],
  };
  if (!allowed[current].includes(next)) throw new BadRequestException('Invalid deal stage transition');
  if ((['inspection', 'agreed', 'dispatched'].includes(next) && !isSeller) || (next === 'completed' && isSeller))
    throw new ForbiddenException('Only the responsible participant may confirm this stage');
}
export function checkContact(input: { approved: boolean; blocked: boolean; enabled: boolean; own: boolean }): void {
  if (!input.approved || input.blocked || !input.enabled || input.own)
    throw new ForbiddenException('Seller contact is not authorized');
}
export function publicText(value: string): string {
  if (/(?:\d[\s()+.\-]*){10,}|https?:|www\.|\S+@\S+/i.test(value))
    throw new BadRequestException('Keep contact details and links out of public text');
  return value;
}
