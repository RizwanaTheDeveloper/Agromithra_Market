import { Global, Module } from '@nestjs/common';
import { AuthController, ProfileController, VerificationController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
@Global()
@Module({ controllers: [AuthController, ProfileController, VerificationController], providers: [AuthService, AuthGuard], exports: [AuthGuard] })
export class AuthModule {}
