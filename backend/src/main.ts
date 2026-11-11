import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaFilter } from './common/prisma.filter';
import { RequestLog } from './common/request-log';

async function bootstrap(): Promise<void> {
 const app = await NestFactory.create<NestExpressApplication>(AppModule);
 const config = app.get(ConfigService);
 if ((config.get<string>('OTP_SECRET') ?? '').length < 32) throw new Error('Set OTP_SECRET to at least 32 random characters');
 // Behind a reverse proxy set TRUST_PROXY=1 so rate limits and logs see the real client address.
 const proxy = config.get<string>('TRUST_PROXY');
 if (proxy) app.set('trust proxy', /^\d+$/.test(proxy) ? Number(proxy) : proxy);
 // The app is served from another origin and embeds listing photos/videos from this API.
 app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
 app.enableShutdownHooks();
 app.useGlobalFilters(new PrismaFilter());
 app.useGlobalInterceptors(new RequestLog());
 const origins = (config.get<string>('CORS_ORIGIN') ?? '').split(',').map(v=>v.trim()).filter(Boolean);
 app.enableCors({origin:origins.length ? origins : false});
 app.setGlobalPrefix('api/v1');
 app.useGlobalPipes(new ValidationPipe({whitelist:true, forbidNonWhitelisted:true, transform:true}));
 await app.listen(Number(config.get<string>('PORT') ?? 5000), '0.0.0.0');
}
void bootstrap();
