import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
 const app = await NestFactory.create(AppModule);
 const config = app.get(ConfigService);
 const origins = (config.get<string>('CORS_ORIGIN') ?? '').split(',').map(v=>v.trim()).filter(Boolean);
 app.enableCors({origin:origins.length ? origins : false});
 app.setGlobalPrefix('api/v1');
 app.useGlobalPipes(new ValidationPipe({whitelist:true, forbidNonWhitelisted:true, transform:true}));
 await app.listen(Number(config.get<string>('PORT') ?? 5000), '0.0.0.0');
}
void bootstrap();
