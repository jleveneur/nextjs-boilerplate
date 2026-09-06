/**
 * Request-scoped context passed into every application service.
 *
 * Composition roots build this once per request. Services never read ambient
 * session state or `process.env`.
 */

import type { Database, DbTransaction } from "@repo/db";
import type { Logger } from "@repo/logger";
import type { Actor } from "@repo/types";

import type { AnalyticsSink } from "./ports/analytics.ts";
import type { Clock } from "./ports/clock.ts";
import type { EventBus } from "./ports/event-bus.ts";
import type { FileStore } from "./ports/file-store.ts";
import type { FlagProvider } from "./ports/flags.ts";
import type { IdGenerator } from "./ports/id-generator.ts";
import type { JobQueue } from "./ports/job-queue.ts";
import type { Mailer } from "./ports/mailer.ts";
import type { PaymentGateway } from "./ports/payment-gateway.ts";

export type CtxPorts = {
  /** `APP_ENV` — first segment of storage object keys. */
  appEnv: string;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
  jobs: JobQueue;
  mailer: Mailer;
  files: FileStore;
  flags: FlagProvider;
  analytics: AnalyticsSink;
  payments: PaymentGateway;
};

export type Ctx = {
  actor: Actor;
  db: Database;
  logger: Logger;
  ports: CtxPorts;
  /** Set while inside `withTransaction` for the current request. */
  tx?: DbTransaction;
};
