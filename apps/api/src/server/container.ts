import { createAuth, type Auth } from "@repo/auth";
import { createCache, type Cache } from "@repo/cache";
import { subscribeInvoiceVoidedNotify, type CtxPorts } from "@repo/core";
import { createDb, type Database, type SqlClient } from "@repo/db";
import * as dbSchema from "@repo/db/schema";
import { createResendMailer, createSmtpMailer, type Mailer as EmailMailer } from "@repo/email";
import { createLogger, type Logger } from "@repo/logger";

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
};

function createEmailMailer(): EmailMailer {
  if (env.SMTP_URL !== undefined && env.SMTP_URL !== "") {
    return createSmtpMailer({ smtpUrl: env.SMTP_URL, from: env.EMAIL_FROM });
  }
  return createResendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
}

function buildContainer(): AppContainer {
  const logger = createLogger({
    service: "api",
    env: env.APP_ENV,
    level: env.LOG_LEVEL,
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

  const ports = createAppPorts({
    redisUrl: env.REDIS_URL,
    emailMailer,
  });

  subscribeInvoiceVoidedNotify(ports.events, ports.jobs);

  const cache = createCache({
    redisUrl: env.REDIS_URL,
    appEnv: env.APP_ENV,
  });

  return { db, sql, logger, auth, ports, cache, emailMailer };
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
