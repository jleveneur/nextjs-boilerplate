import { z } from "zod";

/** Redis / Valkey connection for cache and BullMQ. */
export const redis = z.object({
  REDIS_URL: z.url().refine(
    (value) => {
      // Must not throw — see the note on DATABASE_URL in db.ts.
      try {
        const protocol = new URL(value).protocol;
        return protocol === "redis:" || protocol === "rediss:";
      } catch {
        return false;
      }
    },
    { message: "must be a redis:// or rediss:// URL" },
  ),
});
