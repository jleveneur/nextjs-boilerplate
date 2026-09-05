import { createAnalyticsSink, subscribeToAnalytics } from "@repo/analytics";
import {
  adaptEmailMailer,
  createInProcessEventBus,
  createSystemClock,
  createUuidIdGenerator,
  type CtxPorts,
  type FileStore,
  type FlagProvider,
} from "@repo/core";
import type { Mailer as EmailMailer } from "@repo/email";
import {
  createEnvFlagProvider,
  createPostHogFlagProvider,
  hasFlagName,
  resolveFlag,
} from "@repo/flags";
import { createLazyBullMqJobQueue } from "@repo/jobs";
import { createPaymentGateway } from "@repo/payments";

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

function createFlagPort(options: {
  flagValues?: Readonly<Record<string, boolean>>;
  posthogApiKey?: string;
  posthogHost?: string;
}): FlagProvider {
  const envProvider =
    options.flagValues === undefined
      ? createEnvFlagProvider()
      : createEnvFlagProvider({ values: options.flagValues });
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
  flagValues?: Readonly<Record<string, boolean>>;
  stripeSecretKey?: string;
}): AppPortsHandle {
  const events = createInProcessEventBus();
  const jobs = createLazyBullMqJobQueue({ redisUrl: options.redisUrl });
  const analytics = createAnalyticsSink({
    apiKey: options.posthogApiKey,
    host: options.posthogHost,
  });
  subscribeToAnalytics(events, analytics);
  const payments = createPaymentGateway({ secretKey: options.stripeSecretKey });

  return {
    ports: {
      appEnv: options.appEnv,
      clock: createSystemClock(),
      ids: createUuidIdGenerator(),
      events,
      jobs,
      mailer: adaptEmailMailer(options.emailMailer),
      files: createNoopFileStore(),
      flags: createFlagPort(options),
      analytics,
      payments,
    },
    closeAnalytics: () => analytics.shutdown(),
  };
}
