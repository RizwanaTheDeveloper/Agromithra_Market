import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { ListingsModule } from './modules/listings/listings.module';
import { AuthModule } from './modules/auth/auth.module';
import { DealsModule } from './modules/deals/deals.module';
import { MarketModule } from './modules/market/market.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { MediaModule } from './modules/media/media.module';
// Per client address, per minute. Override with THROTTLE_LIMIT; auth routes use a stricter limit of their own.
const limit = Number(process.env.THROTTLE_LIMIT) > 0 ? Number(process.env.THROTTLE_LIMIT) : 300;
@Module({
  imports:[ConfigModule.forRoot({isGlobal:true}),ThrottlerModule.forRoot([{ttl:60000,limit}]),PrismaModule,HealthModule,AuthModule,ListingsModule,DealsModule,MarketModule,WorkspaceModule,MediaModule],
  providers:[{provide:APP_GUARD,useClass:ThrottlerGuard}],
})
export class AppModule {}
