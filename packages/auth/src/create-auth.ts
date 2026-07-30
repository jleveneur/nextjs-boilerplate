/**
 * Better Auth composition-root factory.
 *
 * Side effects (email, Redis) and the Drizzle schema/db handle are injected —
 * this package never imports `@repo/email`, `@repo/cache`, or `@repo/db`
 * (same-layer ban).
 */

import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink, organization, twoFactor } from "better-auth/plugins";

import { ac, organizationRoles } from "./access-control.ts";
import { apiKeyPrefixForEnv } from "./api-key-prefix.ts";
import { createRedisSecondaryStorage } from "./secondary-storage.ts";
import type { CreateAuthOptions } from "./types.ts";

const DAY = 60 * 60 * 24;

export type Auth = ReturnType<typeof createAuth>["auth"];

export function createAuth(options: CreateAuthOptions) {
  const secondary =
    options.redisUrl === undefined ? undefined : createRedisSecondaryStorage(options.redisUrl);

  const socialProviders = {
    ...(options.github === undefined
      ? {}
      : {
          github: {
            clientId: options.github.clientId,
            clientSecret: options.github.clientSecret,
          },
        }),
    ...(options.google === undefined
      ? {}
      : {
          google: {
            clientId: options.google.clientId,
            clientSecret: options.google.clientSecret,
          },
        }),
  };

  const auth = betterAuth({
    appName: options.appName ?? "app",
    secret: options.secret,
    baseURL: options.baseURL,
    database: drizzleAdapter(options.db, {
      provider: "pg",
      schema: options.schema,
    }),
    ...(secondary === undefined
      ? {}
      : {
          secondaryStorage: {
            get: secondary.get,
            set: secondary.set,
            delete: secondary.delete,
          },
        }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url, token }) => {
        await options.sendVerificationEmail({
          user: { id: user.id, email: user.email, name: user.name },
          url,
          token,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url, token }) => {
        await options.sendVerificationEmail({
          user: { id: user.id, email: user.email, name: user.name },
          url,
          token,
        });
      },
    },
    socialProviders,
    session: {
      expiresIn: DAY * 30,
      updateAge: DAY,
      // Absolute upper bound: sessions older than 90 days must re-authenticate.
      freshAge: DAY * 90,
      cookieCache: {
        enabled: options.cookieCache !== false,
        maxAge: 5 * 60,
      },
    },
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    plugins: [
      organization({
        ac,
        roles: organizationRoles,
        allowUserToCreateOrganization: true,
        creatorRole: "owner",
        async sendInvitationEmail(data) {
          if (options.sendInvitationEmail === undefined) {
            return;
          }

          await options.sendInvitationEmail({
            email: data.email,
            invitationId: data.id,
            inviterName: data.inviter.user.name,
            organizationName: data.organization.name,
            url: `${options.baseURL}/accept-invitation/${data.id}`,
          });
        },
      }),
      apiKey({
        references: "organization",
        defaultPrefix: apiKeyPrefixForEnv(options.appEnv),
        enableMetadata: true,
        permissions: {
          defaultPermissions: {
            invoice: ["read"],
            apiKey: ["list"],
          },
        },
      }),
      twoFactor({
        issuer: options.appName ?? "app",
        allowPasswordless: true,
      }),
      passkey({
        rpID: new URL(options.baseURL).hostname,
        rpName: options.appName ?? "app",
        origin: options.baseURL,
      }),
      magicLink({
        sendMagicLink: async ({ email, url, token }) => {
          await options.sendMagicLink({ email, url, token });
        },
      }),
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
        impersonationSessionDuration: 60 * 60,
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            // Personal organization at signup (ADR-0006) — invisible for single-user products.
            const slugBase =
              user.email
                .split("@")[0]
                ?.toLowerCase()
                .replace(/[^a-z0-9-]/g, "-") || "org";
            const slug = `${slugBase}-${user.id.slice(0, 8)}`;
            // `userId` is a server-only field — call without session headers.
            await auth.api.createOrganization({
              body: {
                name: `${user.name}'s workspace`,
                slug,
                userId: user.id,
              },
            });
          },
        },
      },
    },
  });

  return {
    auth,
    async close() {
      if (secondary !== undefined) {
        await secondary.quit();
      }
    },
  };
}
