import { describe, expect, it } from "vitest";
import { z } from "zod";

import { encodeCursor } from "@repo/utils";

import { createdAtIdCursorSchema } from "./cursor-payload.ts";
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  paginatedResponseRestSchema,
  paginatedResponseSchema,
  paginationQuerySchema,
  parseCursorPayload,
  toRestPaginatedResponse,
} from "./pagination.ts";

describe("paginationQuerySchema", () => {
  it("defaults limit and accepts an optional cursor", () => {
    // Optional keys are omitted when absent — not present as `undefined`.
    expect(paginationQuerySchema.parse({})).toStrictEqual({ limit: DEFAULT_PAGE_LIMIT });

    expect(paginationQuerySchema.parse({ limit: "10", cursor: "abc" })).toStrictEqual({
      limit: 10,
      cursor: "abc",
    });
  });

  it("rejects a limit above the ceiling", () => {
    expect(() => paginationQuerySchema.parse({ limit: MAX_PAGE_LIMIT + 1 })).toThrow();
  });
});

describe("paginatedResponseSchema", () => {
  it("requires null nextCursor on the last page", () => {
    const schema = paginatedResponseSchema(z.object({ id: z.string() }));

    expect(schema.parse({ data: [{ id: "1" }], nextCursor: null })).toStrictEqual({
      data: [{ id: "1" }],
      nextCursor: null,
    });

    expect(() => schema.parse({ data: [] })).toThrow();
  });
});

describe("toRestPaginatedResponse", () => {
  it("maps nextCursor to next_cursor once, at the edge", () => {
    expect(toRestPaginatedResponse({ data: [{ id: "1" }], nextCursor: "c1" })).toStrictEqual({
      data: [{ id: "1" }],
      next_cursor: "c1",
    });
  });
});

describe("paginatedResponseRestSchema", () => {
  it("describes the public snake_case wire shape", () => {
    const schema = paginatedResponseRestSchema(z.object({ id: z.string() }));

    expect(schema.parse({ data: [{ id: "1" }], next_cursor: null })).toStrictEqual({
      data: [{ id: "1" }],
      next_cursor: null,
    });
  });
});

describe("parseCursorPayload", () => {
  it("round-trips a keyset cursor through utils encoding", () => {
    const payload = {
      createdAt: "2026-07-30T12:00:00.000Z",
      id: "017f22e2-79b0-7cc3-98c4-dc0c0c07398f",
    };
    const cursor = encodeCursor(payload);

    expect(parseCursorPayload(cursor, createdAtIdCursorSchema)).toStrictEqual(payload);
  });

  it("returns undefined for a malformed or wrong-shaped cursor", () => {
    expect(parseCursorPayload("not-a-cursor", createdAtIdCursorSchema)).toBeUndefined();
    expect(
      parseCursorPayload(encodeCursor({ createdAt: "nope" }), createdAtIdCursorSchema),
    ).toBeUndefined();
  });
});
