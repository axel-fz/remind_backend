import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await argon2.verify(user.passwordHash, pass)) {
      const { passwordHash, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(email: string, pass: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('User already exists');
    }
    const hash = await argon2.hash(pass);
    const user = await this.usersService.create(email, hash);

    // Send admin notification
    try {
      await this.transporter.sendMail({
        from: `"Remind App" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: 'edgarfezeu@gmail.com',
        subject: `🎉 New User Signup: ${email}`,
        text: `A new user just signed up for the Remind App!\n\nEmail: ${email}`,
      });
      this.logger.log(`Admin notification sent for new user ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send admin notification: ${error.message}`);
    }

    return this.login(user);
  }
}
