import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { GoogleAuthService } from './google-auth.service.js';
import { GithubAuthService } from './github-auth.service.js';
import { MailService } from './mail.service.js';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard, GoogleAuthService, GithubAuthService, MailService],
})
export class AuthModule {}
