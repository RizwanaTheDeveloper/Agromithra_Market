import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { ListingsModule } from './modules/listings/listings.module';
@Module({imports:[ConfigModule.forRoot({isGlobal:true}),PrismaModule,HealthModule,ListingsModule]})
export class AppModule {}
