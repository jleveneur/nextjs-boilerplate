import type { Database } from "@repo/db";

export type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
};

export type SendVerificationEmailInput = {
  user: { id: string; email: string; name: string };
  url: string;
  token: string;
};

export type SendMagicLinkInput = {
  email: string;
  url: string;
  token: string;
};

export type SendInvitationEmailInput = {
  email: string;
  invitationId: string;
  inviterName: string;
  organizationName: string;
  url: string;
};

export type CreateAuthOptions = {
  db: Database;
  secret: string;
  baseURL: string;
  /** `APP_ENV` — drives API key prefix (`sk_live_` vs `sk_test_`). */
  appEnv: string;
  appName?: string;
  github?: OAuthProviderConfig;
  google?: OAuthProviderConfig;
  sendVerificationEmail: (input: SendVerificationEmailInput) => Promise<void>;
  sendMagicLink: (input: SendMagicLinkInput) => Promise<void>;
  sendInvitationEmail?: (input: SendInvitationEmailInput) => Promise<void>;
  /** Optional Redis URL for Better Auth secondary storage (not `@repo/cache`). */
  redisUrl?: string;
};
