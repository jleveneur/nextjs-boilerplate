import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as CoreModule from "@repo/core";
import { relayOutboxBatch } from "@repo/core";
import type { Logger } from "@repo/logger";

import type { AppContainer } from "./container.ts";
import { startOutboxRelay } from "./outbox-relay.ts";

vi.mock("@repo/core", async (importOriginal) => {
  const actual = await importOriginal<typeof CoreModule>();
  return {
    ...actual,
    relayOutboxBatch: vi.fn(),
  };
});

const POLL_MS = 50;

function makeLogger(): Logger {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- relay only logs
  return { info: vi.fn(), error: vi.fn() } as unknown as Logger;
}

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- relay only forwards db and jobs
const CONTAINER = { db: {}, jobs: {} } as AppContainer;

/** Let the in-flight tick settle, then fire the timer it scheduled. */
async function advanceOneTick(): Promise<void> {
  await vi.advanceTimersByTimeAsync(POLL_MS);
}

describe("startOutboxRelay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(relayOutboxBatch).mockReset();
    vi.mocked(relayOutboxBatch).mockResolvedValue({
      claimed: 0,
      published: 0,
      failed: 0,
      skipped: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls immediately and then on the interval", async () => {
    const handle = startOutboxRelay(CONTAINER, POLL_MS, makeLogger());

    await vi.advanceTimersByTimeAsync(0);
    expect(relayOutboxBatch).toHaveBeenCalledOnce();

    await advanceOneTick();
    expect(relayOutboxBatch).toHaveBeenCalledTimes(2);

    handle.stop();
  });

  it("logs only batches that claimed something", async () => {
    const logger = makeLogger();
    vi.mocked(relayOutboxBatch).mockResolvedValueOnce({
      claimed: 2,
      published: 2,
      failed: 0,
      skipped: 0,
    });

    const handle = startOutboxRelay(CONTAINER, POLL_MS, logger);
    await vi.advanceTimersByTimeAsync(0);
    expect(logger.info).toHaveBeenCalledOnce();

    // An idle relay polls constantly; logging every empty batch would bury the
    // lines that matter.
    await advanceOneTick();
    expect(logger.info).toHaveBeenCalledOnce();

    handle.stop();
  });

  /**
   * The relay is the only thing moving domain events onto the queue. A tick
   * that throws must not end the loop, or events stop flowing until a restart.
   */
  it("keeps polling after a failed tick", async () => {
    const logger = makeLogger();
    vi.mocked(relayOutboxBatch).mockRejectedValueOnce(new Error("db unreachable"));

    const handle = startOutboxRelay(CONTAINER, POLL_MS, logger);
    await vi.advanceTimersByTimeAsync(0);
    expect(logger.error).toHaveBeenCalledOnce();

    await advanceOneTick();
    expect(relayOutboxBatch).toHaveBeenCalledTimes(2);

    handle.stop();
  });

  it("stops polling once stopped", async () => {
    const handle = startOutboxRelay(CONTAINER, POLL_MS, makeLogger());

    await vi.advanceTimersByTimeAsync(0);
    expect(relayOutboxBatch).toHaveBeenCalledOnce();

    handle.stop();
    await vi.advanceTimersByTimeAsync(POLL_MS * 5);
    expect(relayOutboxBatch).toHaveBeenCalledOnce();
  });
});
