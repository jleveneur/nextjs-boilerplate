import { relayOutboxBatch } from "@repo/core";
import type { Logger } from "@repo/logger";

import type { AppContainer } from "./container.ts";

export type OutboxRelayHandle = {
  stop(): void;
};

/**
 * Poll the transactional outbox and publish due rows to BullMQ.
 */
export function startOutboxRelay(
  container: AppContainer,
  pollMs: number,
  logger: Logger,
): OutboxRelayHandle {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    try {
      const result = await relayOutboxBatch({
        db: container.db,
        jobs: container.jobs,
      });
      if (result.claimed > 0) {
        logger.info(result, "outbox relay batch");
      }
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error.message : String(error) },
        "outbox relay tick failed",
      );
    } finally {
      if (!stopped) {
        timer = setTimeout(() => {
          void tick();
        }, pollMs);
      }
    }
  };

  void tick();

  return {
    stop() {
      stopped = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    },
  };
}
