import { Body, Controller, ForbiddenException, Get, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { ImportPricesDto, ObservationQuery, PriceQuery } from './market.dto';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}
  @Get('observations') observations(@Query() query: ObservationQuery) { return this.market.observations(query); }
  @Get('estimate') estimate(@Query() query: PriceQuery) { return this.market.estimate(query); }
  @Post('imports') @UseGuards(AuthGuard)
  import(@CurrentUser() user: User, @Body() body: ImportPricesDto) {
    if (!user.isAdmin) throw new ForbiddenException();
    return this.market.import(user.id, body);
  }
}
