import type { CtxPorts } from "../ctx.ts";

import { createFakeClock } from "./fake-clock.ts";
import { createInMemoryEventBus } from "./in-memory-event-bus.ts";
import { createInMemoryFileStore } from "./in-memory-file-store.ts";
import { createInMemoryJobQueue } from "./in-memory-job-queue.ts";
import { createInMemoryMailer } from "./in-memory-mailer.ts";
import { createNoopAnalyticsSink, createNoopFlagProvider } from "./noop-ports.ts";
import { createSequenceIdGenerator } from "./uuid-id-generator.ts";

export type TestPorts = CtxPorts & {
  clock: ReturnType<typeof createFakeClock>;
  events: ReturnType<typeof createInMemoryEventBus>;
  jobs: ReturnType<typeof createInMemoryJobQueue>;
  mailer: ReturnType<typeof createInMemoryMailer>;
};

/** Full in-memory port bundle for service unit tests. */
export function createTestPorts(): TestPorts {
  return {
    clock: createFakeClock(),
    ids: createSequenceIdGenerator(),
    events: createInMemoryEventBus(),
    jobs: createInMemoryJobQueue(),
    mailer: createInMemoryMailer(),
    files: createInMemoryFileStore(),
    flags: createNoopFlagProvider(),
    analytics: createNoopAnalyticsSink(),
  };
}
