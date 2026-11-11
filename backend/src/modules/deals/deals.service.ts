import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { checkQuantity, checkTransition } from '../../common/policy';
import { CreateDealDto, StageDto } from './deals.dto';

@Injectable()
export class DealsService {
  constructor(private readonly db: PrismaService) {}
  async create(buyerId: string, body: CreateDealDto) {
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${buyerId + body.idempotencyKey}))`;
      const existing = await tx.deal.findUnique({ where: { buyerId_idempotencyKey: { buyerId, idempotencyKey: body.idempotencyKey } } });
      if (existing) {
        if (existing.listingId !== body.listingId || !existing.quantity.equals(body.quantity)) throw new ConflictException('Idempotency key reused with different request');
        return existing;
      }
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${body.listingId}::uuid FOR UPDATE`;
      const listing = await tx.listing.findFirst({ where: { id: body.listingId, status: 'active', expiresAt: { gt: new Date() } } });
      if (!listing) throw new NotFoundException('Listing unavailable');
      checkQuantity(listing.unit, body.quantity);
      const verification = await tx.buyerVerification.findUnique({ where: { userId: buyerId } });
      const blocked = await tx.sellerBlock.findUnique({ where: { sellerId_buyerId: { sellerId: listing.sellerId, buyerId } } });
      if (buyerId === listing.sellerId || blocked || verification?.status !== 'approved') throw new ForbiddenException();
      if (listing.quantity.lt(body.quantity) || listing.minimumOrder.gt(body.quantity)) throw new BadRequestException('Quantity outside listing limits');
      return tx.deal.create({ data: { buyerId, sellerId: listing.sellerId, listingId: listing.id, quantity: body.quantity, unit: listing.unit, unitPrice: listing.price, idempotencyKey: body.idempotencyKey, events: { create: { actorId: buyerId, stage: 'quote' } } } });
    });
  }
  async transition(actorId: string, id: string, body: StageDto) {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Deal" WHERE id = ${id}::uuid FOR UPDATE`;
      const deal = await tx.deal.findUnique({ where: { id } });
      if (!deal || (deal.buyerId !== actorId && deal.sellerId !== actorId)) throw new NotFoundException();
      if (deal.version !== body.version) throw new ConflictException('Deal changed; reload before updating');
      checkTransition(deal.stage, body.stage, actorId === deal.sellerId);
      if (body.stage === 'agreed') {
        const verification = await tx.buyerVerification.findUnique({ where: { userId: deal.buyerId } });
        const blocked = await tx.sellerBlock.findUnique({ where: { sellerId_buyerId: { sellerId: deal.sellerId, buyerId: deal.buyerId } } });
        if (verification?.status !== 'approved' || blocked) throw new ForbiddenException('Buyer no longer authorized');
        // Atomic stock reservation prevents two concurrent acceptances overselling.
        const reserved = await tx.listing.updateMany({ where: { id: deal.listingId, status: 'active', expiresAt: { gt: new Date() }, quantity: { gte: deal.quantity } }, data: { quantity: { decrement: deal.quantity }, revision: { increment: 1 } } });
        if (!reserved.count) throw new ConflictException('Stock unavailable');
      }
      if (body.stage === 'cancelled' && deal.stage === 'agreed')
        await tx.listing.update({ where: { id: deal.listingId }, data: { quantity: { increment: deal.quantity }, revision: { increment: 1 } } });
      return tx.deal.update({ where: { id }, data: { stage: body.stage, version: { increment: 1 }, events: { create: { actorId, stage: body.stage } } }, include: { events: true, listing: { select: { id: true, title: true, category: true, city: true } }, buyer: { select: { id: true, displayName: true } }, seller: { select: { id: true, displayName: true } } } });
    });
  }
}
