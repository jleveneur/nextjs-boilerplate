/**
 * Cursor pagination.
 *
 * Offset pagination repeats and skips rows under concurrent writes, so it is not
 * offered. A page is `{ data, nextCursor }` (oRPC / TypeScript) or
 * `{ data, next_cursor }` on the public REST surface — same shape, one casing
 * transform in the REST serializer.
 *
 * The cursor string is opaque. Encoding lives in `@repo/utils`; signing (when a
 * secret is available) lives in the API layer. This package only validates that
 * a cursor is a non-empty string and that decoded payloads match a schema.
 */

import { z } from "zod";

import { decodeCursor } from "@repo/utils";

/** Default page size when the client omits `limit`. */
export const DEFAULT_PAGE_LIMIT = 20;

/** Hard ceiling so a client cannot ask for an unbounded page. */
export const MAX_PAGE_LIMIT = 100;

/**
 * Query parameters for a cursor page.
 *
 * `limit` is coerced from a string because query params arrive as strings on
 * REST. oRPC callers pass a number and coercion is a no-op.
 */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
  cursor: z.string().min(1).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Builds a paginated response schema for an item type.
 *
 * `nextCursor` is `null` on the last page (not omitted), so clients can tell
 * "no more pages" from "field forgotten" without a second channel.
 */
export function paginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    nextCursor: z.string().nullable(),
  });
}

export type PaginatedResponse<T> = {
  readonly data: readonly T[];
  readonly nextCursor: string | null;
};

/**
 * REST public shape of {@link paginatedResponseSchema}.
 *
 * Kept as a separate schema rather than a transform so OpenAPI generation can
 * describe `next_cursor` without inventing a second source of truth at the edge.
 */
export function paginatedResponseRestSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    next_cursor: z.string().nullable(),
  });
}

/**
 * Maps an internal paginated response to the REST wire shape.
 *
 * The one place casing changes for pagination — not in every route handler.
 */
export function toRestPaginatedResponse<T>(page: PaginatedResponse<T>): {
  data: readonly T[];
  next_cursor: string | null;
} {
  return { data: page.data, next_cursor: page.nextCursor };
}

/**
 * Decodes a cursor and validates its payload.
 *
 * Returns `undefined` when the cursor is malformed or the payload does not
 * match `schema`. Callers must reject the request in that case — falling back
 * to page one leaves a client paginating forever over the first page.
 */
export function parseCursorPayload<T>(cursor: string, schema: z.ZodType<T>): T | undefined {
  const raw = decodeCursor(cursor);
  if (raw === undefined) return undefined;

  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}
