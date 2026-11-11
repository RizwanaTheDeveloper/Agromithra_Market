import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PageQuery } from '../../common/dto';
import { checkContact, checkExpiry, checkQuantity, checkUnit, publicText } from '../../common/policy';
import { ContactSettingsDto, CreateListingDto } from './listings.dto';
import { mediaMetadata } from '../media/media.module';

const publicSeller = { select: { id: true, displayName: true, city: true } } as const;

@Injectable()
export class ListingsService {
  constructor(private readonly db: PrismaService) {}
  async all(query: PageQuery) {
    const where: Prisma.ListingWhereInput = { status: 'active', quantity: { gt: 0 }, expiresAt: { gt: new Date() }, category: query.category, city: query.city,
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.listing.findMany({ where, include: { seller: publicSeller, media:{select:mediaMetadata,orderBy:{position:'asc'}} }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: query.offset, take: query.limit }),
      this.db.listing.count({ where }),
    ]);
    return { items, total, offset: query.offset, limit: query.limit };
  }
  async mine(sellerId: string, query: PageQuery) {
    return { items: await this.db.listing.findMany({ where: { sellerId }, include:{media:{select:mediaMetadata,orderBy:{position:'asc'}}}, orderBy: { createdAt: 'desc' }, skip: query.offset, take: query.limit }) };
  }
  async detail(id: string) {
    const listing = await this.db.listing.findFirst({ where: { id, status: 'active', expiresAt: { gt: new Date() } }, include: { seller: publicSeller,media:{select:mediaMetadata,orderBy:{position:'asc'}} } });
    if (!listing) throw new NotFoundException('Listing unavailable');
    return listing;
  }
  private data(body: CreateListingDto) {
    checkUnit(body.category, body.unit);
    checkQuantity(body.unit, body.quantity); checkQuantity(body.unit, body.minimumOrder);
    if (body.minimumOrder > body.quantity) throw new BadRequestException('Minimum order exceeds quantity');
    for (const value of [body.title, body.description, body.product, body.variety, body.grade, body.city, body.district, body.state, ...(body.details ?? []).flatMap(d => [d.label, d.value])]) publicText(value);
    return { ...body, details: (body.details ?? []) as unknown as Prisma.InputJsonValue, expiresAt: checkExpiry(body.expiresAt) };
  }
  create(sellerId: string, body: CreateListingDto) { return this.db.listing.create({ data: { ...this.data(body), sellerId } }); }
  async edit(sellerId: string, id: string, body: CreateListingDto) {
    const data = this.data(body);
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${id}::uuid FOR UPDATE`;
      if (await tx.deal.count({ where: { listingId: id, stage: { in: ['quote', 'inspection', 'agreed', 'dispatched'] } } }))
        throw new ConflictException('Close existing deals before editing listing details');
      const result = await tx.listing.updateMany({ where: { id, sellerId, status: { in: ['draft', 'active', 'paused'] } }, data: { ...data, revision: { increment: 1 } } });
      if (!result.count) throw new NotFoundException('Editable listing not found');
      return tx.listing.findUnique({ where: { id } });
    });
  }
  async status(sellerId: string, id: string, status: ListingStatus) {
    const result = await this.db.listing.updateMany({ where: { id, sellerId, status: { in: ['draft', 'active', 'paused'] }, ...(status === 'active' ? { expiresAt: { gt: new Date() }, quantity: { gt: 0 } } : {}) }, data: { status, revision: { increment: 1 } } });
    if (!result.count) throw new NotFoundException('Listing not found or cannot be published');
    return { id, status };
  }
  async settings(sellerId: string, id: string, data: ContactSettingsDto) {
    const result = await this.db.listing.updateMany({ where: { id, sellerId }, data });
    if (!result.count) throw new NotFoundException();
    return { id, ...data };
  }
  async block(sellerId: string, buyerId: string) {
    if (sellerId === buyerId) throw new BadRequestException();
    await this.db.sellerBlock.upsert({ where: { sellerId_buyerId: { sellerId, buyerId } }, create: { sellerId, buyerId }, update: {} });
    return { blocked: true };
  }
  async unblock(sellerId: string, buyerId: string) {
    await this.db.sellerBlock.deleteMany({ where: { sellerId, buyerId } });
    return { blocked: false };
  }
  async contact(buyerId: string, id: string, channel: 'call' | 'whatsapp') {
    return this.db.$transaction(async tx => {
      const listing = await tx.listing.findFirst({ where: { id, status: 'active', expiresAt: { gt: new Date() } }, include: { seller: { select: { phone: true } } } });
      if (!listing) throw new NotFoundException();
      const verification = await tx.buyerVerification.findUnique({ where: { userId: buyerId } });
      const blocked = await tx.sellerBlock.findUnique({ where: { sellerId_buyerId: { sellerId: listing.sellerId, buyerId } } });
      checkContact({ approved: verification?.status === 'approved', blocked: !!blocked, enabled: channel === 'call' ? listing.allowCall : listing.allowWhatsapp, own: listing.sellerId === buyerId });
      await tx.contactEvent.create({ data: { buyerId, listingId: id, channel } });
      return { channel, url: channel === 'call' ? `tel:${listing.seller.phone}` : `https://wa.me/${listing.seller.phone.slice(1)}` };
    });
  }
}
