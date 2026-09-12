import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";

import { ac, roles } from "@repo/authz";
import * as schema from "@repo/db";
import { db } from "@repo/db";
import { invitationEmail, resetPasswordEmail, sendEmail, verificationEmail } from "@repo/email";
import { env } from "@repo/env";

import { rememberActiveOrganization, resolveActiveOrganization } from "./active-organization.ts";

const DAY_IN_SECONDS = 60 * 60 * 24;

/**
 * The Better Auth instance.
 *
 * Email and password with verified addresses, plus the organization plugin for
 * multi-tenancy and invitations. Every other method — OAuth providers, magic
 * links, passkeys — needs configuration or infrastructure that belongs to a
 * product, not to a starter. Adding one is a plugin and a migration.
 * https://www.better-auth.com/docs/authentication/email-password
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
    },
  }),

  emailAndPassword: {
    enabled: true,
    // An unverified address is an account someone else may own. Sign-up
    // therefore does not produce a session; the link in the email does.
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...resetPasswordEmail({ name: user.name, url }) });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // The link is proof of the address, so it is also proof enough to sign in.
    // Without this the user verifies and is then asked to sign in again.
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...verificationEmail({ name: user.name, url }) });
    },
  },

  session: {
    expiresIn: DAY_IN_SECONDS * 30,
    updateAge: DAY_IN_SECONDS,
    // Signed cookie holding the session, so the common path costs no query.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  rateLimit: {
    enabled: env.AUTH_RATE_LIMIT === "on",
  },

  advanced: {
    // `NODE_ENV=production` defaults to Secure cookies, which browsers drop on
    // plain HTTP. Follow the public URL instead so `next start` works locally.
    useSecureCookies: new URL(env.BETTER_AUTH_URL).protocol === "https:",
  },

  plugins: [
    organization({
      ac,
      roles,
      creatorRole: "owner",
      sendInvitationEmail: async ({ id, email, inviter, organization: invitedTo }) => {
        await sendEmail({
          to: email,
          ...invitationEmail({
            organizationName: invitedTo.name,
            inviterName: inviter.user.name,
            // The invitation id is the token: Better Auth looks the row up by
            // it and checks the address on the invitation against the caller.
            url: `${env.BETTER_AUTH_URL}/accept-invitation/${id}`,
          }),
        });
      },
    }),
  ],

  databaseHooks: {
    session: {
      create: {
        /**
         * Start every session in an organization.
         *
         * `activeOrganizationId` is what the plugin's permission checks read,
         * so a session without one can do nothing until the user picks a
         * tenant — and nothing in this starter asks them to.
         *
         * This runs from the session hook rather than a user-creation one
         * because Better Auth queues `create.after` hooks until the
         * surrounding transaction finishes: at sign-up, a user hook has not
         * run by the time the session row is written.
         */
        before: async (created) => ({
          data: {
            ...created,
            activeOrganizationId: await resolveActiveOrganization(created.userId),
          },
        }),
      },

      update: {
        /**
         * Remember a switch for the next session.
         *
         * Switching organizations is a session update, so this fires for it
         * without the transport having to know. That matters: Better Auth's
         * own route is the only caller that can hand the browser the
         * refreshed session cookie, and a switch made anywhere else would
         * leave the cookie cache pointing at the previous organization.
         */
        after: async (updated) => {
          const active = updated["activeOrganizationId"];
          if (typeof active === "string") {
            await rememberActiveOrganization(updated.userId, active);
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

export { createPersonalOrganization, resolveActiveOrganization } from "./active-organization.ts";
