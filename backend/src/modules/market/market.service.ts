import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportPricesDto, ObservationQuery, PriceQuery } from './market.dto';

export function validateObservation(record: { reportedAt: string; minimum: number; modal: number; maximum: number }): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.reportedAt)) throw new BadRequestException('Reporting date must be YYYY-MM-DD');
  const date = new Date(record.reportedAt);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== record.reportedAt || date > new Date())
    throw new BadRequestException('Invalid or future reporting date');
  if (record.minimum > record.modal || record.modal > record.maximum) throw new BadRequestException('Expected minimum <= modal <= maximum');
  return date;
}

@Injectable()
export class MarketService {
  constructor(private readonly db: PrismaService) {}
  async import(actorId: string, body: ImportPricesDto) {
    const records = body.records.map(record => ({ ...record, reportedAt: validateObservation(record), importedBy: actorId }));
    const result = await this.db.marketObservation.createMany({ data: records, skipDuplicates: true });
    return { imported: result.count, duplicates: records.length - result.count, provenance: 'admin-imported-unverified' };
  }
  async observations(query: ObservationQuery) {
    return { items: await this.db.marketObservation.findMany({ where: query, orderBy: [{ reportedAt: 'desc' }, { market: 'asc' }], take: 100 }) };
  }
  async estimate(query: PriceQuery) {
    const records = await this.db.marketObservation.findMany({ where: { ...query, reportedAt: { gte: new Date(Date.now() - 7 * 86400000) } }, orderBy: { reportedAt: 'desc' }, take: 1000 });
    if (!records.length) return { available: false, reason: 'No matching observations in the past seven days', ...query };
    // Keep separate sources and markets separate. Select the latest date per source/market.
    const seen = new Set<string>();
    const references = records.filter(row => {
      const key = JSON.stringify([row.market, row.sourceName]);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).map(row => ({ market: row.market, reportedAt: row.reportedAt, minimum: row.minimum, modal: row.modal, maximum: row.maximum, sourceName: row.sourceName, sourceUrl: row.sourceUrl, provenance: row.provenance }));
    return { available: true, ...query, references, guaranteedSalePrice: false, qualityAdjustmentApplied: false };
  }
}
