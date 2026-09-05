// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

import { capture } from "@repo/analytics";
import { createAuth, type Auth } from "@repo/auth";
import type { CtxPorts } from "@repo/core";
import { createDb, type Database } from "@repo/db";
import * as dbSchema from "@repo/db/schema";
import { createResendMailer, createSmtpMailer, type Mailer as EmailMailer } from "@repo/email";
import { createLogger, type Logger } from "@repo/logger";
import { getTraceContext } from "@repo/observability";

import { env } from "../env/server.ts";
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
  logger: Logger;
  auth: Auth;
  ports: CtxPorts;
  emailMailer: EmailMailer;
  closeAnalytics: () => Promise<void>;
};

function createEmailMailer(): EmailMailer {
  if (env.SMTP_URL !== undefined) {
    return createSmtpMailer({ smtpUrl: env.SMTP_URL, from: env.EMAIL_FROM });
  }
  if (env.RESEND_API_KEY !== undefined) {
    return createResendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
  }
  throw new Error("SMTP_URL or RESEND_API_KEY is required");
}

function buildContainer(): AppContainer {
  const release = env.SENTRY_RELEASE ?? process.env["GITHUB_SHA"];
  const logger = createLogger({
    service: "web",
    env: env.APP_ENV,
    level: env.LOG_LEVEL,
    ...(release !== undefined ? { version: release } : {}),
    getTraceContext,
  });

  const { db } = createDb({
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

  // Ports before auth so signup hooks can capture through the analytics sink.
  const { ports, closeAnalytics } = createAppPorts({
    appEnv: env.APP_ENV,
    redisUrl: env.REDIS_URL,
    emailMailer,
    ...(env.POSTHOG_API_KEY !== undefined ? { posthogApiKey: env.POSTHOG_API_KEY } : {}),
    ...(env.POSTHOG_HOST !== undefined ? { posthogHost: env.POSTHOG_HOST } : {}),
    ...(env.FLAGS_JSON !== undefined ? { flagValues: env.FLAGS_JSON } : {}),
    ...(env.STRIPE_SECRET_KEY !== undefined ? { stripeSecretKey: env.STRIPE_SECRET_KEY } : {}),
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  const { auth } = createAuth({
    db,
    schema: authSchema,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    appEnv: env.APP_ENV,
    appName: "Repo",
    redisUrl: env.REDIS_URL,
    ...(env.GITHUB_CLIENT_ID !== undefined &&
    env.GITHUB_CLIENT_ID !== "" &&
    env.GITHUB_CLIENT_SECRET !== undefined &&
    env.GITHUB_CLIENT_SECRET !== ""
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
    ...(env.GOOGLE_CLIENT_ID !== undefined &&
    env.GOOGLE_CLIENT_ID !== "" &&
    env.GOOGLE_CLIENT_SECRET !== undefined &&
    env.GOOGLE_CLIENT_SECRET !== ""
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
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
    onUserCreated: async ({ method }) => {
      await capture(ports.analytics, "user.signed_up", { method });
    },
    onOrganizationCreated: async ({ organizationId, plan }) => {
      await capture(ports.analytics, "organization.created", { organizationId, plan });
    },
  });

  return { db, logger, auth, ports, emailMailer, closeAnalytics };
}

const globalForContainer = globalThis as typeof globalThis & {
  repoWebContainer?: AppContainer;
};

export function getContainer(): AppContainer {
  if (globalForContainer.repoWebContainer === undefined) {
    globalForContainer.repoWebContainer = buildContainer();
  }
  return globalForContainer.repoWebContainer;
}
