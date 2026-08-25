import { createAnalyticsSink, subscribeToAnalytics } from "@repo/analytics";
import {
  adaptEmailMailer,
  createInProcessEventBus,
  createSystemClock,
  createUuidIdGenerator,
  type Ctx,
  type CtxPorts,
} from "@repo/core";
import { createDb, type Database, type SqlClient } from "@repo/db";
import { createResendMailer, createSmtpMailer, type Mailer as EmailMailer } from "@repo/email";
import {
  createEnvFlagProvider,
  createPostHogFlagProvider,
  hasFlagName,
  resolveFlag,
} from "@repo/flags";
import {
  createBullMqJobQueue,
  createBullMqWorker,
  type BullMqJobQueue,
  type BullMqWorker,
  type JobHandlers,
} from "@repo/jobs";
import { createLogger, runWithLogger, type Logger } from "@repo/logger";
import { captureUnexpectedException, getTraceContext } from "@repo/observability";
import { createPaymentGateway } from "@repo/payments";
import { createFileStore } from "@repo/storage";
import type { Actor } from "@repo/types";
import { Redis } from "ioredis";

import { createAssetReconcileHandler } from "./consumers/asset-reconcile.ts";
import { createEmailSendHandler } from "./consumers/email-send.ts";
import { createImageDeriveHandler } from "./consumers/image-derive.ts";
import { createInvoiceVoidedNotifyHandler } from "./consumers/invoice-voided-notify.ts";
import { createStripeEventProcessHandler } from "./consumers/stripe-event-process.ts";
import { env } from "./env.ts";

export type AppContainer = {
  db: Database;
  sql: SqlClient;
  logger: Logger;
  ports: CtxPorts;
  emailMailer: EmailMailer;
  jobs: BullMqJobQueue;
  worker: BullMqWorker;
  /** Shared Redis for idempotency keys (not BullMQ's connection). */
  idempotencyRedis: Redis;
  buildCtx: (actor: Actor) => Ctx;
  closeAnalytics: () => Promise<void>;
};

function createEmailMailer(): EmailMailer {
  if (env.SMTP_URL !== undefined && env.SMTP_URL !== "") {
    return createSmtpMailer({ smtpUrl: env.SMTP_URL, from: env.EMAIL_FROM });
  }
  return createResendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
}

export function buildContainer(): AppContainer {
  const release = env.SENTRY_RELEASE ?? process.env["GITHUB_SHA"];
  const logger = createLogger({
    service: "worker",
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
  const files = createFileStore({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: true,
  });

  const jobs = createBullMqJobQueue({ redisUrl: env.REDIS_URL });
  const idempotencyRedis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
  });

  const events = createInProcessEventBus();
  const analyticsSink = createAnalyticsSink({
    apiKey: env.POSTHOG_API_KEY,
    host: env.POSTHOG_HOST,
  });
  subscribeToAnalytics(events, analyticsSink);

  const envFlags =
    env.FLAGS_JSON === undefined
      ? createEnvFlagProvider()
      : createEnvFlagProvider({ flagsJson: env.FLAGS_JSON });
  const posthogFlags =
    env.POSTHOG_API_KEY !== undefined && env.POSTHOG_HOST !== undefined
      ? createPostHogFlagProvider({
          apiKey: env.POSTHOG_API_KEY,
          host: env.POSTHOG_HOST,
        })
      : undefined;

  const payments = createPaymentGateway({ secretKey: env.STRIPE_SECRET_KEY });

  const ports: CtxPorts = {
    appEnv: env.APP_ENV,
    clock: createSystemClock(),
    ids: createUuidIdGenerator(),
    events,
    jobs,
    mailer: adaptEmailMailer(emailMailer),
    files,
    flags: {
      isEnabled(flag, context) {
        if (!hasFlagName(flag)) {
          return Promise.resolve(false);
        }
        return resolveFlag(posthogFlags ?? envFlags, flag, context);
      },
    },
    analytics: {
      capture(event, properties) {
        return analyticsSink.capture(event, properties);
      },
    },
    payments,
  };

  const buildCtx = (actor: Actor): Ctx => ({
    actor,
    db,
    logger,
    ports,
  });

  const handlers: JobHandlers = {
    "email.send": createEmailSendHandler({ buildCtx, mailer: emailMailer, idempotencyRedis }),
    "invoice.voided.notify": createInvoiceVoidedNotifyHandler({
      buildCtx,
      mailer: emailMailer,
      idempotencyRedis,
    }),
    "image.derive": createImageDeriveHandler({ buildCtx, files, idempotencyRedis }),
    "asset.reconcile-orphans": createAssetReconcileHandler({ buildCtx }),
    "stripe.event.process": createStripeEventProcessHandler({ buildCtx }),
  };

  const worker = createBullMqWorker({
    redisUrl: env.REDIS_URL,
    handlers: {
      "email.send": async (payload, meta) => {
        const jobLogger = logger.child({
          jobId: meta.jobId,
          jobName: "email.send",
          attempt: meta.attemptsMade,
        });
        await runWithLogger(jobLogger, () => handlers["email.send"](payload, meta));
      },
      "invoice.voided.notify": async (payload, meta) => {
        const jobLogger = logger.child({
          jobId: meta.jobId,
          jobName: "invoice.voided.notify",
          attempt: meta.attemptsMade,
        });
        await runWithLogger(jobLogger, () => handlers["invoice.voided.notify"](payload, meta));
      },
      "image.derive": async (payload, meta) => {
        const jobLogger = logger.child({
          jobId: meta.jobId,
          jobName: "image.derive",
          attempt: meta.attemptsMade,
        });
        await runWithLogger(jobLogger, () => handlers["image.derive"](payload, meta));
      },
      "asset.reconcile-orphans": async (payload, meta) => {
        const jobLogger = logger.child({
          jobId: meta.jobId,
          jobName: "asset.reconcile-orphans",
          attempt: meta.attemptsMade,
        });
        await runWithLogger(jobLogger, () => handlers["asset.reconcile-orphans"](payload, meta));
      },
      "stripe.event.process": async (payload, meta) => {
        const jobLogger = logger.child({
          jobId: meta.jobId,
          jobName: "stripe.event.process",
          attempt: meta.attemptsMade,
        });
        await runWithLogger(jobLogger, () => handlers["stripe.event.process"](payload, meta));
      },
    },
    concurrency: 2,

    onDeadLetter(record) {
      logger.error(
        {
          queueName: record.queueName,
          dlqName: record.dlqName,
          jobName: record.jobName,
          jobId: record.jobId,
          attemptsMade: record.attemptsMade,
          failedReason: record.failedReason,
        },
        "job moved to dead-letter queue",
      );
      captureUnexpectedException(new Error(record.failedReason), {
        extra: {
          jobId: record.jobId,
          jobName: record.jobName,
          attemptsMade: record.attemptsMade,
        },
      });
    },
    onDeadLetterError({ record, stage, error }) {
      logger.error(
        {
          err: error,
          queueName: record.queueName,
          dlqName: record.dlqName,
          jobName: record.jobName,
          jobId: record.jobId,
          attemptsMade: record.attemptsMade,
          deadLetterStage: stage,
        },
        "failed to process job dead-lettering",
      );
      captureUnexpectedException(error, {
        extra: {
          jobId: record.jobId,
          jobName: record.jobName,
          attemptsMade: record.attemptsMade,
          deadLetterStage: stage,
        },
      });
    },
  });

  return {
    db,
    sql,
    logger,
    ports,
    emailMailer,
    jobs,
    worker,
    idempotencyRedis,
    buildCtx,
    closeAnalytics: () => analyticsSink.shutdown(),
  };
}
