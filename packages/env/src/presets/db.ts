import { z } from "zod";

import { positiveInt } from "../coerce.ts";

/** PostgreSQL connection. Required by anything that touches `@repo/db`. */
export const db = z.object({
  DATABASE_URL: z.url().refine(
    (value) => {
      // Must not throw: Zod may still invoke refine after a failed url check when
      // schemas are recomposed by shape, and an exception bypasses safeParse.
      try {
        const protocol = new URL(value).protocol;
        return protocol === "postgres:" || protocol === "postgresql:";
      } catch {
        return false;
      }
    },
    { message: "must be a postgres:// or postgresql:// URL" },
  ),
  DATABASE_POOL_SIZE: positiveInt.default(10),
});
