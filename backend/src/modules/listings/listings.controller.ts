import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { PageQuery } from '../../common/dto';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { ContactDto, ContactSettingsDto, CreateListingDto, ListingStatusDto } from './listings.dto';
import { ListingsService } from './listings.service';
@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}
  @Get() all(@Query() query: PageQuery) { return this.listings.all(query); }
  @Get('mine') @UseGuards(AuthGuard)
  mine(@CurrentUser() user: User, @Query() query: PageQuery) { return this.listings.mine(user.id, query); }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) { return this.listings.detail(id); }
  @Post() @UseGuards(AuthGuard)
  create(@CurrentUser() user: User, @Body() body: CreateListingDto) { return this.listings.create(user.id, body); }
  @Patch(':id') @UseGuards(AuthGuard)
  edit(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() body: CreateListingDto) { return this.listings.edit(user.id, id, body); }
  @Patch(':id/status') @UseGuards(AuthGuard)
  status(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() body: ListingStatusDto) { return this.listings.status(user.id, id, body.status); }
  @Patch(':id/contact-settings') @UseGuards(AuthGuard)
  settings(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() body: ContactSettingsDto) { return this.listings.settings(user.id, id, body); }
  @Post(':id/contact') @UseGuards(AuthGuard)
  contact(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() body: ContactDto) { return this.listings.contact(user.id, id, body.channel); }
  @Post('blocks/:buyerId') @UseGuards(AuthGuard)
  block(@CurrentUser() user: User, @Param('buyerId', ParseUUIDPipe) buyerId: string) { return this.listings.block(user.id, buyerId); }
  @Delete('blocks/:buyerId') @UseGuards(AuthGuard)
  unblock(@CurrentUser() user: User, @Param('buyerId', ParseUUIDPipe) buyerId: string) { return this.listings.unblock(user.id, buyerId); }
}
