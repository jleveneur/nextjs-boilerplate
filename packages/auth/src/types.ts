import type { drizzleAdapter } from "better-auth/adapters/drizzle";

/**
 * Drizzle database handle from the composition root (`createDb().db`).
 * Typed via Better Auth's adapter so `@repo/auth` never imports `@repo/db`
 * (same-layer ban — inject schema + db).
 */
export type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

type DrizzleAdapterOptions = NonNullable<Parameters<typeof drizzleAdapter>[1]>;

/** Tables Better Auth + our plugins need — supplied by `@repo/db/schema` at the edge. */
export type AuthSchema = NonNullable<DrizzleAdapterOptions["schema"]>;

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

export type SignupMethod = "password" | "oauth" | "magic_link";

export type OnUserCreatedInput = {
  userId: string;
  method: SignupMethod;
};

export type OnOrganizationCreatedInput = {
  organizationId: string;
  plan: string;
};

export type CreateAuthOptions = {
  db: AuthDatabase;
  schema: AuthSchema;
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
  /**
   * Cookie cache avoids a DB hit per request. Disable in integration tests so
   * session mutations (active org, impersonation) are visible immediately.
   */
  cookieCache?: boolean;
  /**
   * Fired after a user row is created (composition root maps to analytics).
   * Default signup method is `password`; OAuth/magic-link refine later if needed.
   */
  onUserCreated?: (input: OnUserCreatedInput) => Promise<void>;
  /** Fired after the personal organization is created at signup. */
  onOrganizationCreated?: (input: OnOrganizationCreatedInput) => Promise<void>;
};
