import type { drizzleAdapter } from "better-auth/adapters/drizzle";

import type { Locale } from "@repo/i18n";

import type { OnAuditEvent } from "./audit-event.ts";

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

/**
 * Language to write the email in, negotiated from the request that triggered it.
 *
 * Resolved here rather than in the composition root because only this package
 * sees Better Auth's `request` argument. Always a supported locale — negotiation
 * falls back rather than failing — so a callback never handles a missing value.
 *
 * It is the *request's* language, not a stored user preference: this codebase has
 * no locale column on `user`. That is right for a sign-up or an invitation, where
 * the request is the recipient's own browser. It is a guess for a send triggered
 * by someone else, and it degrades to the default locale when Better Auth invokes
 * a callback with no request at all.
 */
type LocalizedEmail = {
  locale: Locale;
};

export type SendVerificationEmailInput = LocalizedEmail & {
  user: { id: string; email: string; name: string };
  url: string;
  token: string;
};

export type SendMagicLinkInput = LocalizedEmail & {
  email: string;
  url: string;
  token: string;
};

export type SendInvitationEmailInput = LocalizedEmail & {
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

export type { AuthAuditEvent, OnAuditEvent } from "./audit-event.ts";

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
  /**
   * Fired after org, membership, invitation, and API-key mutations.
   * Composition roots map this to `recordAuditLog` — await it, do not detach.
   */
  onAuditEvent?: OnAuditEvent;
};
