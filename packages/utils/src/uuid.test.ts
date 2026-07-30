import { afterEach, describe, expect, it, vi } from "vitest";

import { isUuidV7 } from "./uuid.ts";

/**
 * The generator keeps the last millisecond and counter in module state, so tests
 * that manipulate the clock would otherwise inherit a high-water mark from whatever
 * ran before them. Re-importing gives each test its own state.
 */
async function freshGenerator(): Promise<() => string> {
  vi.resetModules();
  const module = await import("./uuid.ts");

  return module.generateUuidV7;
}

/** Reads the 48-bit big-endian timestamp back out of an id. */
function timestampOf(uuid: string): number {
  return Number.parseInt(uuid.replaceAll("-", "").slice(0, 12), 16);
}

/** Reads the 12-bit sequence counter that occupies `rand_a`. */
function counterOf(uuid: string): number {
  return Number.parseInt(uuid.replaceAll("-", "").slice(13, 16), 16);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("generateUuidV7", () => {
  it("produces a canonical UUIDv7", async () => {
    const generate = await freshGenerator();

    expect(isUuidV7(generate())).toBe(true);
  });

  it("encodes the current time in the leading 48 bits", async () => {
    const generate = await freshGenerator();
    const now = Date.UTC(2026, 6, 30, 12, 0, 0);
    vi.setSystemTime(now);

    // The whole premise of choosing v7 is that the prefix is a real timestamp. If
    // the byte packing were wrong the ids would still look valid and still sort —
    // just not by creation time, which nothing else would reveal.
    expect(timestampOf(generate())).toBe(now);
  });

  it("keeps ids unique and ordered within a single millisecond", async () => {
    const generate = await freshGenerator();
    vi.setSystemTime(Date.UTC(2026, 6, 30, 12, 0, 0));

    // Enough to exhaust the counter's headroom and force the overflow branch: the
    // seed leaves at least 2048 increments, so 5000 ids cross it.
    const ids = Array.from({ length: 5000 }, generate);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.toSorted()).toStrictEqual(ids);
  });

  it("increments the counter rather than re-randomising it within a millisecond", async () => {
    const generate = await freshGenerator();
    vi.setSystemTime(Date.UTC(2026, 6, 30, 12, 0, 0));

    const first = generate();
    const second = generate();

    // Ordering within a millisecond comes from the counter, not from luck. Random
    // rand_a would pass the sort assertion above roughly half the time.
    expect(counterOf(second)).toBe(counterOf(first) + 1);
  });

  it("borrows a millisecond when the counter overflows", async () => {
    const generate = await freshGenerator();
    const now = Date.UTC(2026, 6, 30, 12, 0, 0);
    vi.setSystemTime(now);

    const ids = Array.from({ length: 5000 }, generate);
    const timestamps = ids.map(timestampOf);

    // Overflow moves into the next millisecond instead of blocking or colliding.
    // The clock never advanced, so any timestamp above `now` proves the borrow —
    // and it must stay tightly bounded, or ids drift into the future.
    expect(Math.max(...timestamps)).toBeGreaterThan(now);
    expect(Math.max(...timestamps)).toBeLessThanOrEqual(now + 3);
  });

  it("stays monotonic when the clock moves backwards", async () => {
    const generate = await freshGenerator();
    vi.setSystemTime(Date.UTC(2026, 6, 30, 12, 0, 0));
    const before = generate();

    // An NTP correction or a resumed VM snapshot. Trusting the clock here emits ids
    // that sort before rows already written, which is how a keyset paginator starts
    // skipping records — a data-loss bug that looks like a UI glitch.
    vi.setSystemTime(Date.UTC(2026, 6, 30, 11, 59, 59));
    const after = generate();

    expect(after > before).toBe(true);
    expect(timestampOf(after)).toBeGreaterThanOrEqual(timestampOf(before));
  });

  it("sorts by creation time across milliseconds", async () => {
    const generate = await freshGenerator();
    let now = Date.UTC(2026, 6, 30, 12, 0, 0);
    vi.setSystemTime(now);

    const ids: string[] = [];
    for (let index = 0; index < 50; index += 1) {
      ids.push(generate());
      now += 1;
      vi.setSystemTime(now);
    }

    expect(ids.toSorted()).toStrictEqual(ids);
  });

  it("does not repeat across many calls on the real clock", async () => {
    const generate = await freshGenerator();

    const ids = Array.from({ length: 10_000 }, generate);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("isUuidV7", () => {
  it("accepts ids from the generator", async () => {
    const generate = await freshGenerator();

    for (let index = 0; index < 100; index += 1) {
      expect(isUuidV7(generate())).toBe(true);
    }
  });

  it("rejects other UUID versions", () => {
    // The point of checking the version nibble: a v4 id is structurally a valid
    // UUID but carries no timestamp, so anything relying on id ordering breaks.
    expect(isUuidV7(crypto.randomUUID())).toBe(false);
    expect(isUuidV7("017f22e2-79b0-1cc3-98c4-dc0c0c07398f")).toBe(false);
  });

  it("rejects a wrong variant", () => {
    expect(isUuidV7("017f22e2-79b0-7cc3-08c4-dc0c0c07398f")).toBe(false);
  });

  it("rejects malformed strings", () => {
    for (const value of [
      "",
      "not-a-uuid",
      "017f22e279b07cc398c4dc0c0c07398f", // unhyphenated
      "017F22E2-79B0-7CC3-98C4-DC0C0C07398F", // uppercase is not canonical
      "017f22e2-79b0-7cc3-98c4-dc0c0c07398", // too short
      "017f22e2-79b0-7cc3-98c4-dc0c0c07398ff", // too long
      " 017f22e2-79b0-7cc3-98c4-dc0c0c07398f",
    ]) {
      expect(isUuidV7(value)).toBe(false);
    }
  });
});
