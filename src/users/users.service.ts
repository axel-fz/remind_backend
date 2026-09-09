import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../database/database.types.js';
import type { DrizzleDatabase } from '../database/database.types.js';
import { users } from '../database/schema.js';
import type { User } from '../database/schema.js';

export type SafeUser = Omit<
  User,
  | 'passwordHash'
  | 'refreshTokenHash'
  | 'passwordResetTokenHash'
  | 'passwordResetTokenExpiresAt'
>;

@Injectable()
export class UsersService {
  linkGithubId: any;
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleDatabase) {}

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user;
  }

  async findByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);

    return user;
  }

  async findByGithubId(githubId: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.githubId, githubId))
      .limit(1);

    return user;
  }

  async createWithPassword(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
      })
      .returning();

    return user;
  }

  async createOAuthUser(data: {
    name: string;
    email: string;
    avatarUrl?: string;
    googleId?: string;
    githubId?: string;
  }): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
        googleId: data.googleId,
        githubId: data.githubId,
      })
      .returning();

    return user;
  }

  async linkGoogleId(userId: string, googleId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ googleId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateRefreshTokenHash(
    userid: string,
    refreshTokenHash: string,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ refreshTokenHash, updatedAt: new Date() })
      .where(eq(users.id, userid));
  }

  async clearRefreshTokenHash(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ refreshTokenHash: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setPasswordResetToken(
    userid: string,
    passwordResetTokenHash: string,
    passwordResetTokenExpiresAt: Date,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordResetTokenHash,
        passwordResetTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userid));
  }

  async resetPassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async findByPasswordResetTokenHash(
    passwordResetTokenHash: string,
): Promise<User | undefined> {
    const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.passwordResetTokenHash, passwordResetTokenHash))
        .limit(1);

    return user;
}


  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      googleId: user.googleId,
      githubId: user.githubId,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
