import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Module, NotFoundException, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { IsString, IsUUID, Length } from 'class-validator';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';

class StartConversationDto { @IsUUID() listingId!: string; }
class MessageDto { @IsString() @Length(1, 600) text!: string; }
const participant = (id: string) => ({ OR: [{ buyerId:id }, { sellerId:id }] });
const publicPerson = { select:{id:true, displayName:true} } as const;

@Controller('saved') @UseGuards(AuthGuard)
export class SavedController {
  constructor(private readonly db: PrismaService) {}
  @Get() async all(@CurrentUser() user: User) {
    return { items:await this.db.savedListing.findMany({where:{userId:user.id},select:{listingId:true}}) };
  }
  @Post(':id') async save(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) listingId: string) {
    if (!await this.db.listing.findFirst({where:{id:listingId,status:'active',expiresAt:{gt:new Date()}}})) throw new NotFoundException('Listing unavailable');
    return this.db.savedListing.upsert({where:{userId_listingId:{userId:user.id,listingId}},create:{userId:user.id,listingId},update:{}});
  }
  @Delete(':id') async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) listingId: string) {
    await this.db.savedListing.deleteMany({where:{userId:user.id,listingId}});
    return {saved:false};
  }
}

@Controller('conversations') @UseGuards(AuthGuard)
export class ConversationsController {
  constructor(private readonly db: PrismaService) {}
  @Get() async all(@CurrentUser() user: User) {
    return {items:await this.db.conversation.findMany({where:participant(user.id),orderBy:{updatedAt:'desc'},take:100,
      include:{buyer:publicPerson,seller:publicPerson,messages:{orderBy:[{createdAt:'desc'},{id:'desc'}],take:100}}})};
  }
  @Post() async start(@CurrentUser() user: User, @Body() body: StartConversationDto) {
    const listing = await this.db.listing.findFirst({where:{id:body.listingId,status:'active',expiresAt:{gt:new Date()}}});
    if (!listing) throw new NotFoundException('Listing unavailable');
    if (listing.sellerId === user.id) throw new BadRequestException('This is your own listing');
    if (await this.db.sellerBlock.findUnique({where:{sellerId_buyerId:{sellerId:listing.sellerId,buyerId:user.id}}})) throw new ForbiddenException();
    return this.db.conversation.upsert({where:{listingId_buyerId:{listingId:listing.id,buyerId:user.id}},
      create:{listingId:listing.id,buyerId:user.id,sellerId:listing.sellerId},update:{}});
  }
  @Post(':id/messages') async send(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() body: MessageDto) {
    const text=body.text.trim(); if (!text) throw new BadRequestException('Enter a message');
    return this.db.$transaction(async tx => {
      const conversation=await tx.conversation.findFirst({where:{id,...participant(user.id)}});
      if (!conversation) throw new NotFoundException();
      if (await tx.sellerBlock.findUnique({where:{sellerId_buyerId:{sellerId:conversation.sellerId,buyerId:conversation.buyerId}}})) throw new ForbiddenException();
      const message=await tx.message.create({data:{conversationId:id,senderId:user.id,text}});
      await tx.conversation.update({where:{id},data:{updatedAt:new Date()}});
      return message;
    });
  }
}

@Module({controllers:[SavedController,ConversationsController]})
export class WorkspaceModule {}
