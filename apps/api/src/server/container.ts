import { createAuth, type Auth } from "@repo/auth";
import { createCache, type Cache } from "@repo/cache";
import type { CtxPorts } from "@repo/core";
import { createDb, type Database, type SqlClient } from "@repo/db";
import * as dbSchema from "@repo/db/schema";
import { createResendMailer, createSmtpMailer, type Mailer as EmailMailer } from "@repo/email";
import { createLogger, type Logger } from "@repo/logger";
import { getTraceContext } from "@repo/observability";

import { env } from "../env.ts";
import { createAppPorts } from "./ports.ts";

const authSchema = {
  user: dbSchema.user,
  session: dbSchema.session,
  account: dbSchema.account,
  verification: dbSchema.verification,
  organization: dbSchema.organization,
  member: dbSchema.member,
  invitation: dbSchema.invitation,
  twoFactor: dbSchema.twoFactor,
  passkey: dbSchema.passkey,
  apikey: dbSchema.apikey,
};

export type AppContainer = {
  db: Database;
  sql: SqlClient;
  logger: Logger;
  auth: Auth;
  ports: CtxPorts;
  cache: Cache;
  emailMailer: EmailMailer;
  closeAnalytics: () => Promise<void>;
};

function createEmailMailer(): EmailMailer {
  if (env.SMTP_URL !== undefined && env.SMTP_URL !== "") {
    return createSmtpMailer({ smtpUrl: env.SMTP_URL, from: env.EMAIL_FROM });
  }
  return createResendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
}

function buildContainer(): AppContainer {
  const release = env.SENTRY_RELEASE ?? process.env["GITHUB_SHA"];
  const logger = createLogger({
    service: "api",
    env: env.APP_ENV,
    level: env.LOG_LEVEL,
    ...(release !== undefined ? { version: release } : {}),
    getTraceContext,
  });

  const { db, client: sql } = createDb({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_SIZE,
  });

  const emailMailer = createEmailMailer();

  const sendHtml = async (input: { to: string; subject: string; html: string }): Promise<void> => {
    await emailMailer.send({
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  };

  const { auth } = createAuth({
    db,
    schema: authSchema,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    appEnv: env.APP_ENV,
    appName: "Repo",
    redisUrl: env.REDIS_URL,
    sendVerificationEmail: async ({ user, url }) => {
      await sendHtml({
        to: user.email,
        subject: "Verify your email",
        html: `<p>Verify your email: <a href="${url}">${url}</a></p>`,
      });
    },
    sendMagicLink: async ({ email, url }) => {
      await sendHtml({
        to: email,
        subject: "Your magic link",
        html: `<p>Sign in: <a href="${url}">${url}</a></p>`,
      });
    },
    sendInvitationEmail: async ({ email, url, organizationName, inviterName }) => {
      await sendHtml({
        to: email,
        subject: `Join ${organizationName}`,
        html: `<p>${inviterName} invited you to ${organizationName}. Accept: <a href="${url}">${url}</a></p>`,
      });
    },
  });

  const { ports, closeAnalytics } = createAppPorts({
    appEnv: env.APP_ENV,
    redisUrl: env.REDIS_URL,
    emailMailer,
    ...(env.POSTHOG_API_KEY !== undefined ? { posthogApiKey: env.POSTHOG_API_KEY } : {}),
    ...(env.POSTHOG_HOST !== undefined ? { posthogHost: env.POSTHOG_HOST } : {}),
    ...(env.FLAGS_JSON !== undefined ? { flagsJson: env.FLAGS_JSON } : {}),
  });

  const cache = createCache({
    redisUrl: env.REDIS_URL,
    appEnv: env.APP_ENV,
  });

  return { db, sql, logger, auth, ports, cache, emailMailer, closeAnalytics };
}

const globalForContainer = globalThis as typeof globalThis & {
  repoApiContainer?: AppContainer;
};

export function getContainer(): AppContainer {
  if (globalForContainer.repoApiContainer === undefined) {
    globalForContainer.repoApiContainer = buildContainer();
  }
  return globalForContainer.repoApiContainer;
}
