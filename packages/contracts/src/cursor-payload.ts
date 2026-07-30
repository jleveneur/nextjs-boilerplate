/**
 * Common cursor payload shapes.
 *
 * Keyset pagination needs a stable sort key and a tie-breaker. For tables that
 * sort by creation time, that pair is `(createdAt, id)`. Feature contracts may
 * define their own payloads; this is the default for "newest first" lists.
 */

import { z } from "zod";

import { timestampSchema } from "./timestamp.ts";

/**
 * Position in a list ordered by `createdAt` descending, then `id` descending.
 *
 * Both fields are required so a page boundary is exact even when many rows share
 * a millisecond timestamp.
 */
export const createdAtIdCursorSchema = z.object({
  createdAt: timestampSchema,
  id: z.string().min(1),
});

export type CreatedAtIdCursor = z.infer<typeof createdAtIdCursorSchema>;
