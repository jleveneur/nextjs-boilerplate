/**
 * Request-scoped context passed into every application service.
 *
 * Composition roots build this once per request. Services never read ambient
 * session state or `process.env`.
 */

import type { Database, DbTransaction } from "@repo/db";
import type { Logger } from "@repo/logger";
import type { Actor } from "@repo/types";

import type {
  AnalyticsSink,
  Clock,
  EventBus,
  FileStore,
  FlagProvider,
  IdGenerator,
  JobQueue,
  Mailer,
} from "./ports/index.ts";

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
};

export type Ctx = {
  actor: Actor;
  db: Database;
  logger: Logger;
  ports: CtxPorts;
  /** Set while inside `withTransaction` for the current request. */
  tx?: DbTransaction;
};
