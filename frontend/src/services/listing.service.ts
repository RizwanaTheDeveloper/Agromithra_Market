import { api } from './api';
export interface ListingSummary { id: string; title: string; }
export async function getListings(): Promise<ListingSummary[]> {
  const { data } = await api.get<{items: ListingSummary[]}>('/listings');
  return data.items;
}
