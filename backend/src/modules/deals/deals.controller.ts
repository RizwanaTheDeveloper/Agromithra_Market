import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { PageQuery } from '../../common/dto';
import { checkExpiry, checkQuantity, checkUnit, publicText } from '../../common/policy';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { CreateDealDto, CreateRequestDto, StageDto } from './deals.dto';
import { DealsService } from './deals.service';

const dealInclude = { listing: { select: { id: true, title: true, category: true, city: true } }, buyer: { select: { id: true, displayName: true } }, seller: { select: { id: true, displayName: true } } } as const;

@Controller('requests')
export class RequestsController {
  constructor(private readonly db: PrismaService) {}
  @Get() async all(@Query() query: PageQuery) {
    return { items: await this.db.buyerRequest.findMany({ where: { closed: false, expiresAt: { gt: new Date() }, category: query.category, city: query.city }, skip: query.offset, take: query.limit, orderBy: { createdAt: 'desc' }, include: { buyer: { select: { id: true, displayName: true } } } }) };
  }
  @Post() @UseGuards(AuthGuard)
  create(@CurrentUser() user: User, @Body() body: CreateRequestDto) {
    checkUnit(body.category, body.unit); for (const value of [body.title, body.city, body.purpose ?? '', body.note ?? '']) publicText(value);
    checkQuantity(body.unit, body.quantity);
    return this.db.buyerRequest.create({ data: { ...body, expiresAt: checkExpiry(body.expiresAt), buyerId: user.id } });
  }
  @Post(':id/close') @UseGuards(AuthGuard)
  async close(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.db.buyerRequest.updateMany({ where: { id, buyerId: user.id }, data: { closed: true } });
    if (!result.count) throw new NotFoundException();
    return { id, closed: true };
  }
}

@Controller('deals') @UseGuards(AuthGuard)
export class DealsController {
  constructor(private readonly db: PrismaService, private readonly deals: DealsService) {}
  @Get() async all(@CurrentUser() user: User, @Query() query: PageQuery) {
    return { items: await this.db.deal.findMany({ where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] }, skip: query.offset, take: query.limit, orderBy: { createdAt: 'desc' }, include: { ...dealInclude, events: { orderBy: { createdAt: 'asc' } } } }) };
  }
  @Get(':id') async detail(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const deal = await this.db.deal.findFirst({ where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] }, include: { ...dealInclude, events: { orderBy: { createdAt: 'asc' } } } });
    if (!deal) throw new NotFoundException();
    return deal;
  }
  @Post() create(@CurrentUser() user: User, @Body() body: CreateDealDto) { return this.deals.create(user.id, body); }
  @Patch(':id/stage') stage(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() body: StageDto) { return this.deals.transition(user.id, id, body); }
}
