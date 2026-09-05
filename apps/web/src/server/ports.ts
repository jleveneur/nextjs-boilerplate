import { createAnalyticsSink, subscribeToAnalytics } from "@repo/analytics";
import {
  adaptEmailMailer,
  createInProcessEventBus,
  createSystemClock,
  createUuidIdGenerator,
  type CtxPorts,
} from "@repo/core";
import type { Mailer as EmailMailer } from "@repo/email";
import { createLazyBullMqJobQueue } from "@repo/jobs";
import { createPaymentGateway } from "@repo/payments";
import { createFileStore } from "@repo/storage";

import { createFlagPort } from "./flag-bootstrap.ts";

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
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
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
      files: createFileStore({
        endpoint: options.s3.endpoint,
        region: options.s3.region,
        bucket: options.s3.bucket,
        accessKeyId: options.s3.accessKeyId,
        secretAccessKey: options.s3.secretAccessKey,
        forcePathStyle: true,
      }),
      flags: createFlagPort(options),
      analytics,
      payments,
    },
    closeAnalytics: () => analytics.shutdown(),
  };
}
