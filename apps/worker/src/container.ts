import type { Ctx, CtxPorts, DomainEvent, EventBus, EventHandler } from "@repo/core";
import { createDb, type Database, type SqlClient } from "@repo/db";
import { createResendMailer, createSmtpMailer, type Mailer as EmailMailer } from "@repo/email";
import {
  createBullMqJobQueue,
  createBullMqWorker,
  type BullMqJobQueue,
  type BullMqWorker,
  type JobHandlers,
} from "@repo/jobs";
import { createLogger, type Logger } from "@repo/logger";
import { createFileStore } from "@repo/storage";
import type { Actor } from "@repo/types";
import { Redis } from "ioredis";

import { createAssetReconcileHandler } from "./consumers/asset-reconcile.ts";
import { createEmailSendHandler } from "./consumers/email-send.ts";
import { createImageDeriveHandler } from "./consumers/image-derive.ts";
import { createInvoiceVoidedNotifyHandler } from "./consumers/invoice-voided-notify.ts";
import { env } from "./env.ts";
import { createUuidIdGenerator } from "./ports.ts";

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
};

function createEmailMailer(): EmailMailer {
  if (env.SMTP_URL !== undefined && env.SMTP_URL !== "") {
    return createSmtpMailer({ smtpUrl: env.SMTP_URL, from: env.EMAIL_FROM });
  }
  return createResendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
}

function createInProcessEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler>>();

  return {
    async emit(event: DomainEvent) {
      const set = handlers.get(event.type);
      if (set === undefined) {
        return;
      }
      await Promise.all([...set].map(async (handler) => handler(event)));
    },
    subscribe(type: string, handler: EventHandler) {
      let set = handlers.get(type);
      if (set === undefined) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler);
      return () => {
        set?.delete(handler);
      };
    },
  };
}

function adaptEmailMailer(mailer: EmailMailer): CtxPorts["mailer"] {
  return {
    async send(input) {
      return mailer.send({
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.headers === undefined ? {} : { headers: input.headers }),
        ...(input.replyTo === undefined ? {} : { replyTo: input.replyTo }),
      });
    },
  };
}

export function buildContainer(): AppContainer {
  const logger = createLogger({
    service: "worker",
    env: env.APP_ENV,
    level: env.LOG_LEVEL,
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

  const ports: CtxPorts = {
    appEnv: env.APP_ENV,
    clock: { now: () => new Date() },
    ids: createUuidIdGenerator(),
    events: createInProcessEventBus(),
    jobs,
    mailer: adaptEmailMailer(emailMailer),
    files,
    flags: {
      isEnabled() {
        return Promise.resolve(false);
      },
    },
    analytics: {
      capture() {
        return Promise.resolve();
      },
    },
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
  };

  const worker = createBullMqWorker({
    redisUrl: env.REDIS_URL,
    handlers,
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
  };
}
