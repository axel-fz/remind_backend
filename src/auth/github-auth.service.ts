import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

export type GithubProfile = {
  githubId: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

type GithubTokenResponse = {
  access_token?: string;
  error?: string;
};

type GithubUserResponse = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url?: string;
};

type GithubEmailResponse = {
  email: string;
  primary: boolean;
  verified: boolean;
};

@Injectable()
export class GithubAuthService {
  constructor(private readonly configService: ConfigService) {}

  generateState(): string {
    return randomBytes(32).toString('hex');
  }
  getAuthorizationUrl(state: string): string {
    const clientId = this.configService.getOrThrow<string>('GITHUB_CLIENT_ID');
    const callbackUrl = this.configService.getOrThrow<string>(
      'GITHUB_CALLBACK_URL',
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'read:user user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }
  async exchangeCodeForAccessToken(code: string): Promise<string> {
    const clientId = this.configService.getOrThrow<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>(
      'GITHUB_CLIENT_SECRET',
    );
    const callbackUrl = this.configService.getOrThrow<string>(
      'GITHUB_CALLBACK_URL',
    );

    const response = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
        }),
      },
    );
    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `GitHub token exchange failed (${response.status}): ${details}`,
      );
    }

    const data = (await response.json()) as GithubTokenResponse;

    if (!data.access_token) {
      throw new Error(
        data.error ?? 'GitHub token response missing access_token',
      );
    }
    return data.access_token;
  }

  async fetchProfile(githubAccessToken: string): Promise<GithubProfile> {
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'nest-auth',
      },
    });

    if (!userResponse.ok) {
      const details = await userResponse.text();
      throw new Error(
        `GitHub profile request failed (${userResponse.status}): ${details}`,
      );
    }

    const user = (await userResponse.json()) as GithubUserResponse;

    let email = user.email;

    if (!email) {
      email = (await this.fetchVerifiedPrimaryEmail(
        githubAccessToken,
      )) as string;
    }

    if (!email) {
      throw new Error('GitHub account has no verified email address');
    }

    return {
      githubId: String(user.id),
      email,
      name: user.name ?? user.login,
      avatarUrl: user.avatar_url,
    };
  }

  private async fetchVerifiedPrimaryEmail(
    githubAccessToken: string,
  ): Promise<string | undefined> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'nest-auth',
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const emails = (await response.json()) as GithubEmailResponse[];

    const primaryVerified = emails.find(
      (entry) => entry.primary && entry.verified,
    );

    if (primaryVerified) {
      return primaryVerified.email;
    }

    const anyVerified = emails.find((entry) => entry.verified);
    return anyVerified?.email;
  }
}
