import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { tokenDigest } from './auth.service';

export interface AuthRequest { headers: { authorization?: string }; user: User; tokenHash: string; }
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): User => context.switchToHttp().getRequest<AuthRequest>().user);
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException();
    const hash = tokenDigest(match[1]);
    const session = await this.db.session.findUnique({ where: { tokenHash: hash }, include: { user: true } });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException();
    request.user = session.user;
    request.tokenHash = hash;
    return true;
  }
}
