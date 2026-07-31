/**
 * Repeatable BullMQ schedules with a stable scheduler id (replica-safe).
 */

import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { JOB_NAMES } from "@repo/jobs";
import type { Logger } from "@repo/logger";

export type SchedulesHandle = {
  close(): Promise<void>;
};

export async function startSchedules(redisUrl: string, logger: Logger): Promise<SchedulesHandle> {
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  const queue = new Queue("default", { connection });

  await queue.upsertJobScheduler(
    "asset-reconcile-orphans",
    { pattern: "0 3 * * *" },
    {
      name: JOB_NAMES.assetReconcileOrphans,
      data: {},
      opts: {
        attempts: 3,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    },
  );

  logger.info({ schedulerId: "asset-reconcile-orphans" }, "repeatable schedules registered");

  return {
    async close() {
      await queue.close();
      await connection.quit();
    },
  };
}
