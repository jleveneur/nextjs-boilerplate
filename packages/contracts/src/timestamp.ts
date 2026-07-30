/**
 * Timestamps on the wire are RFC 3339 UTC strings.
 *
 * Not `Date` objects: JSON has no Date type, and serialising a Date differently
 * on two sides of a transport is how clocks drift into bugs. Parse into a Date
 * only at the edge that needs arithmetic.
 */

import { z } from "zod";

const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u;

/**
 * An RFC 3339 timestamp string.
 *
 * Accepts fractional seconds and numeric offsets; prefers `Z` in examples and
 * fixtures. Rejects date-only values and space-separated forms that some
 * databases emit before normalisation.
 */
export const timestampSchema = z.string().regex(RFC3339, "must be an RFC 3339 timestamp");

export type Timestamp = z.infer<typeof timestampSchema>;

/**
 * Common audit fields attached to durable records on the wire.
 *
 * `deletedAt` is present when the API surfaces soft deletes; omit the field
 * from feature schemas that do not.
 */
export const timestampsSchema = z.object({
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  deletedAt: timestampSchema.nullable().optional(),
});

export type Timestamps = z.infer<typeof timestampsSchema>;
