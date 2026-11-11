import { Module } from '@nestjs/common';
import { DealsController, RequestsController } from './deals.controller';
import { DealsService } from './deals.service';
@Module({ controllers: [DealsController, RequestsController], providers: [DealsService] })
export class DealsModule {}
