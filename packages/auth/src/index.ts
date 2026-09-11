import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { account, db, session, user, verification } from "@repo/db";
import { env } from "@repo/env";

const DAY_IN_SECONDS = 60 * 60 * 24;

/**
 * The Better Auth instance.
 *
 * Email and password only: every other method — OAuth providers, magic links,
 * passkeys, organizations — needs configuration or infrastructure that belongs
 * to a product, not to a starter. Adding one is a plugin and a migration.
 * https://www.better-auth.com/docs/authentication/email-password
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),

  emailAndPassword: {
    enabled: true,
    // Verification would need an email transport, which this starter does not
    // ship. Turn it on together with `sendVerificationEmail`.
    requireEmailVerification: false,
  },

  session: {
    expiresIn: DAY_IN_SECONDS * 30,
    updateAge: DAY_IN_SECONDS,
    // Signed cookie holding the session, so the common path costs no query.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  advanced: {
    // `NODE_ENV=production` defaults to Secure cookies, which browsers drop on
    // plain HTTP. Follow the public URL instead so `next start` works locally.
    useSecureCookies: new URL(env.BETTER_AUTH_URL).protocol === "https:",
  },
});

export type Session = typeof auth.$Infer.Session;
