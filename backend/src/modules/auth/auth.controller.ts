import { Throttle } from '@nestjs/throttler';
import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { publicText } from '../../common/policy';
import { AuthGuard, AuthRequest, CurrentUser } from './auth.guard';
import { AuthService } from './auth.service';
import { ProfileDto, RequestOtpDto, ReviewDto, VerificationDto, VerifyOtpDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly db: PrismaService) {}
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('otp/request') request(@Body() body: RequestOtpDto) { return this.auth.requestOtp(body.phone); }
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('otp/verify') verify(@Body() body: VerifyOtpDto) { return this.auth.verifyOtp(body.challengeId, body.code); }
  @Delete('session') @UseGuards(AuthGuard)
  async logout(@Req() request: AuthRequest) { await this.db.session.deleteMany({ where: { tokenHash: request.tokenHash } }); return { revoked: true }; }
}

@Controller('users/me') @UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly db: PrismaService) {}
  @Get() me(@CurrentUser() user: User) {
    return this.db.user.findUnique({ where: { id: user.id }, select: { id: true, phone: true, displayName: true, city: true, language: true, business: true, role: true, isAdmin: true, verification: true } });
  }
  @Patch() update(@CurrentUser() user: User, @Body() body: ProfileDto) {
    publicText(body.displayName); publicText(body.city);
    return this.db.user.update({ where: { id: user.id }, data: body, select: { id: true, displayName: true, city: true, language: true } });
  }
  @Post('verification') submit(@CurrentUser() user: User, @Body() body: VerificationDto) {
    return this.db.buyerVerification.upsert({ where: { userId: user.id }, create: { userId: user.id, ...body }, update: { ...body, status: 'pending', submittedAt: new Date(), reviewedAt: null, reviewedBy: null, reviewNote: null } });
  }
}

@Controller('admin/verifications') @UseGuards(AuthGuard)
export class VerificationController {
  constructor(private readonly db: PrismaService) {}
  @Get() pending(@CurrentUser() user: User) {
    if (!user.isAdmin) throw new ForbiddenException();
    return this.db.buyerVerification.findMany({ where: { status: 'pending' }, include: { user: { select: { phone: true, displayName: true, city: true } } }, orderBy: { submittedAt: 'asc' }, take: 100 });
  }
  @Patch(':userId') review(@CurrentUser() user: User, @Param('userId', ParseUUIDPipe) userId: string, @Body() body: ReviewDto) {
    if (!user.isAdmin) throw new ForbiddenException();
    return this.db.buyerVerification.update({ where: { userId }, data: { status: body.status, reviewNote: body.note, reviewedBy: user.id, reviewedAt: new Date() } });
  }
}
