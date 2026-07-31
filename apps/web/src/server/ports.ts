import type {
  AnalyticsSink,
  Clock,
  CtxPorts,
  DomainEvent,
  EventBus,
  EventHandler,
  FileStore,
  FlagProvider,
  IdGenerator,
  Mailer,
} from "@repo/core";
import { createBullMqJobQueue } from "@repo/jobs";
import type { InvoiceId, OrganizationId, OutboxId, UserId } from "@repo/types";
import { generateUuidV7 } from "@repo/utils";
import type { Mailer as EmailMailer } from "@repo/email";

function brandInvoiceId(id: string): InvoiceId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as InvoiceId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as OrganizationId;
}

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as UserId;
}

function brandOutboxId(id: string): OutboxId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as OutboxId;
}

export function createSystemClock(): Clock {
  return { now: () => new Date() };
}

export function createUuidIdGenerator(): IdGenerator {
  return {
    uuidV7: () => generateUuidV7(),
    invoiceId: () => brandInvoiceId(generateUuidV7()),
    organizationId: () => brandOrganizationId(generateUuidV7()),
    userId: () => brandUserId(generateUuidV7()),
    outboxId: () => brandOutboxId(generateUuidV7()),
  };
}

export function createInProcessEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler>>();

  return {
    async emit(event: DomainEvent) {
      const set = handlers.get(event.type);
      if (set === undefined) return;
      await Promise.all(
        [...set].map(async (handler) => {
          await handler(event);
        }),
      );
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

export function createNoopFileStore(): FileStore {
  return {
    createPresignedPut() {
      return Promise.reject(new Error("File storage is not configured in this environment"));
    },
    createPresignedGet() {
      return Promise.reject(new Error("File storage is not configured in this environment"));
    },
    headObject() {
      return Promise.resolve(undefined);
    },
    getObject() {
      return Promise.resolve(undefined);
    },
    putObject() {
      return Promise.reject(new Error("File storage is not configured in this environment"));
    },
    deleteObject() {
      return Promise.resolve();
    },
  };
}

export function createNoopFlagProvider(): FlagProvider {
  return {
    isEnabled() {
      return Promise.resolve(false);
    },
  };
}

export function createNoopAnalyticsSink(): AnalyticsSink {
  return {
    capture() {
      return Promise.resolve();
    },
  };
}

/** Adapt `@repo/email` (React-capable) to the core html-only mailer port. */
export function adaptEmailMailer(mailer: EmailMailer): Mailer {
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

export function createAppPorts(options: {
  appEnv: string;
  redisUrl: string;
  emailMailer: EmailMailer;
}): CtxPorts {
  const events = createInProcessEventBus();
  // Lazy BullMQ connection — avoid opening Redis during `next build`.
  let jobs: ReturnType<typeof createBullMqJobQueue> | undefined;

  return {
    appEnv: options.appEnv,
    clock: createSystemClock(),
    ids: createUuidIdGenerator(),
    events,
    jobs: {
      enqueue(name, payload, opts) {
        jobs ??= createBullMqJobQueue({ redisUrl: options.redisUrl });
        return jobs.enqueue(name, payload, opts);
      },
      async close() {
        if (jobs !== undefined) {
          await jobs.close();
        }
      },
    },
    mailer: adaptEmailMailer(options.emailMailer),
    files: createNoopFileStore(),
    flags: createNoopFlagProvider(),
    analytics: createNoopAnalyticsSink(),
  };
}
