import { HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { sendSms } from '../../integrations/otp/sms';

export const tokenDigest = (value: string): string => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(private readonly db: PrismaService, private readonly config: ConfigService) {}
  private otpDigest(id: string, code: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('OTP_SECRET')).update(`${id}:${code}`).digest('hex');
  }
  async requestOtp(phone: string) {
    const mode = this.config.get('OTP_MODE'), development = mode === 'development' && this.config.get('NODE_ENV') !== 'production';
    if (!development && mode !== 'sms') throw new ServiceUnavailableException('SMS provider is not configured');
    const code = String(randomInt(100000, 1000000));
    const challenge = await this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${phone}))`;
      const recent = await tx.otpChallenge.findMany({ where: { phone, createdAt: { gt: new Date(Date.now() - 3600000) } }, orderBy: { createdAt: 'desc' } });
      if (recent.length >= 5 || (recent[0] && Date.now() - recent[0].createdAt.getTime() < 60000))
        throw new HttpException('Wait before requesting another code', 429);
      const id = randomUUID();
      return tx.otpChallenge.create({ data: { id, phone, digest: this.otpDigest(id, code), expiresAt: new Date(Date.now() + 300000) } });
    });
    if (development) return { challengeId: challenge.id, expiresAt: challenge.expiresAt, developmentCode: code };
    try {
      await sendSms(this.config, phone, `Your Agromitra Market code is ${code}. It expires in 5 minutes. Do not share it.`);
    } catch (e) {
      await this.db.otpChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
      throw e;
    }
    return { challengeId: challenge.id, expiresAt: challenge.expiresAt };
  }
  async verifyOtp(challengeId: string, code: string) {
    const token = randomBytes(32).toString('base64url');
    const result = await this.db.$transaction(async tx => {
      const initial = await tx.otpChallenge.findUnique({ where: { id: challengeId } });
      if (!initial) return null;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${initial.phone}))`;
      const challenge = await tx.otpChallenge.findUnique({ where: { id: challengeId } });
      if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date() || challenge.attempts >= 5) return null;
      await tx.otpChallenge.update({ where: { id: challengeId }, data: { attempts: { increment: 1 } } });
      if (!timingSafeEqual(Buffer.from(challenge.digest, 'hex'), Buffer.from(this.otpDigest(challengeId, code), 'hex'))) return null;
      await tx.otpChallenge.updateMany({ where: { phone: challenge.phone, consumedAt: null }, data: { consumedAt: new Date() } });
      // Numbers listed in ADMIN_PHONES (comma separated, +91... format) become administrators on sign-in.
      const admin = (this.config.get<string>('ADMIN_PHONES') ?? '').split(',').map(v => v.trim()).includes(challenge.phone);
      const user = await tx.user.upsert({ where: { phone: challenge.phone }, create: { phone: challenge.phone, isAdmin: admin }, update: admin ? { isAdmin: true } : {} });
      const expiresAt = new Date(Date.now() + 7 * 86400000);
      await tx.session.create({ data: { userId: user.id, tokenHash: tokenDigest(token), expiresAt } });
      return { accessToken: token, tokenType: 'Bearer', expiresAt, userId: user.id };
    });
    if (!result) throw new UnauthorizedException('Invalid or expired code');
    return result;
  }
}
