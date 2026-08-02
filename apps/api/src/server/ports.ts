import {
  createNoopAnalyticsSink,
  createPostHogAnalyticsSink,
  subscribeToAnalytics,
  type AnalyticsSink as RepoAnalyticsSink,
} from "@repo/analytics";
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
import type { Mailer as EmailMailer } from "@repo/email";
import {
  createEnvFlagProvider,
  createPostHogFlagProvider,
  hasFlagName,
  resolveFlag,
} from "@repo/flags";
import { createBullMqJobQueue } from "@repo/jobs";
import type { AssetId, InvoiceId, OrganizationId, OutboxId, UserId } from "@repo/types";
import { generateUuidV7 } from "@repo/utils";

function brandInvoiceId(id: string): InvoiceId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as InvoiceId;
}

function brandAssetId(id: string): AssetId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor
  return id as AssetId;
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
    assetId: () => brandAssetId(generateUuidV7()),
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

function createFlagPort(options: {
  flagsJson?: string;
  posthogApiKey?: string;
  posthogHost?: string;
}): FlagProvider {
  const envProvider =
    options.flagsJson === undefined
      ? createEnvFlagProvider()
      : createEnvFlagProvider({ flagsJson: options.flagsJson });
  const posthogProvider =
    options.posthogApiKey !== undefined &&
    options.posthogApiKey !== "" &&
    options.posthogHost !== undefined
      ? createPostHogFlagProvider({
          apiKey: options.posthogApiKey,
          host: options.posthogHost,
        })
      : undefined;

  return {
    async isEnabled(flag, context) {
      if (!hasFlagName(flag)) {
        return false;
      }
      const provider = posthogProvider ?? envProvider;
      return resolveFlag(provider, flag, context);
    },
  };
}

function createAnalyticsPort(options: { posthogApiKey?: string; posthogHost?: string }): {
  sink: AnalyticsSink;
  repoSink: RepoAnalyticsSink;
} {
  if (
    options.posthogApiKey !== undefined &&
    options.posthogApiKey !== "" &&
    options.posthogHost !== undefined
  ) {
    const repoSink = createPostHogAnalyticsSink({
      apiKey: options.posthogApiKey,
      host: options.posthogHost,
    });
    return {
      repoSink,
      sink: {
        capture(event, properties) {
          return repoSink.capture(event, properties);
        },
      },
    };
  }

  const repoSink = createNoopAnalyticsSink();
  return {
    repoSink,
    sink: {
      capture(event, properties) {
        return repoSink.capture(event, properties);
      },
    },
  };
}

export type AppPortsHandle = {
  ports: CtxPorts;
  /** Flush buffered PostHog captures before process exit. */
  closeAnalytics: () => Promise<void>;
};

export function createAppPorts(options: {
  appEnv: string;
  redisUrl: string;
  emailMailer: EmailMailer;
  posthogApiKey?: string;
  posthogHost?: string;
  flagsJson?: string;
}): AppPortsHandle {
  const events = createInProcessEventBus();
  let jobs: ReturnType<typeof createBullMqJobQueue> | undefined;
  const { sink: analytics, repoSink } = createAnalyticsPort(options);
  subscribeToAnalytics(events, repoSink);

  return {
    ports: {
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
      flags: createFlagPort(options),
      analytics,
    },
    closeAnalytics: () => repoSink.shutdown(),
  };
}
