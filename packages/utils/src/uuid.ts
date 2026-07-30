/**
 * UUIDv7 generation (RFC 9562).
 *
 * A v7 id is a 48-bit millisecond timestamp followed by randomness, so ids sort
 * by creation time as both strings and binary. That matters for reasons unrelated
 * to sorting: random v4 keys scatter B-tree inserts across the whole index, so the
 * hot pages never fit in cache and write amplification grows with table size,
 * while sequential integers leak how many rows exist and invite enumeration. v7
 * gives v4's opacity with sequential locality.
 *
 * PostgreSQL 18 generates these natively as a column default. This exists for the
 * cases needing an id *before* the insert — a storage key, an outbox row that must
 * reference its own id, a test with a known value.
 *
 * Hand-written rather than taken from a dependency: it is a page of code with a
 * fixed specification, and `crypto.getRandomValues` supplies the only hard part.
 * Uses the Web Crypto global rather than `node:crypto` so this package stays
 * importable in a browser bundle.
 */

/** Bytes in a UUID. */
const UUID_BYTES = 16;

/** `rand_a`, the 12 bits between the version nibble and the variant bits. */
const MAX_COUNTER = 0xfff;

/**
 * Ceiling for a fresh counter seed, leaving room to increment within a
 * millisecond before the counter overflows. 2048 ids in one millisecond is far
 * beyond what a single process reaches; the headroom is why overflow stays a
 * theoretical branch rather than a load-dependent one.
 */
const COUNTER_SEED_CEILING = 0x800;

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Millisecond of the last id issued, and the counter within it.
 *
 * Module state, which makes `generateUuidV7` the one impure function in this
 * package. The alternative is ids that collide or go backwards within a
 * millisecond, which is worse: pagination built on id ordering would silently skip
 * or repeat rows.
 */
let lastMilliseconds = -1;
let counter = 0;

/**
 * Returns a new UUIDv7 in canonical hyphenated lowercase form.
 *
 * Successive calls are strictly increasing, including within one millisecond and
 * across a clock that moves backwards. Returns a plain `string`. Narrowing to a
 * branded id (`UserId`, …) happens in the `IdGenerator` port that wraps this —
 * this package stays dependency-free so it remains the leaf every other
 * foundation package can share.
 */
export function generateUuidV7(): string {
  const { milliseconds, sequence } = nextSequencePosition();

  const bytes = new Uint8Array(UUID_BYTES);
  crypto.getRandomValues(bytes);

  // Written through a DataView rather than by indexing the array. Its accessors
  // are big-endian by default, which is the byte order a UUID needs, and they are
  // typed as returning `number` — indexed reads are `number | undefined` under
  // noUncheckedIndexedAccess, which would mean a `?? 0` fallback on every read
  // that can never be taken and can never be covered by a test.
  const view = new DataView(bytes.buffer);

  // Timestamp: 48 bits across bytes 0-5, as a 16-bit half and a 32-bit half.
  // Bitwise operators coerce to 32 bits, so `milliseconds >>> 32` would yield zero
  // for any real timestamp; the division avoids them entirely.
  view.setUint16(0, Math.floor(milliseconds / 0x1_0000_0000));
  view.setUint32(2, milliseconds % 0x1_0000_0000);

  // Version 7 in the high nibble of byte 6, sequence counter in the remaining 12
  // bits. Replacing rand_a with a counter is the monotonicity method RFC 9562
  // describes; it costs nothing, since those bits are otherwise random.
  view.setUint8(6, 0x70 | ((sequence >>> 8) & 0x0f));
  view.setUint8(7, sequence & 0xff);

  // RFC 4122 variant: top two bits of byte 8 set to 0b10, leaving 62 random bits.
  view.setUint8(8, 0x80 | (view.getUint8(8) & 0x3f));

  return format(bytes);
}

/**
 * Whether `value` is a canonical UUIDv7 string.
 *
 * Checks shape, version, and variant — not that this generator produced it, which
 * is unknowable. Use at trust boundaries before narrowing an untrusted string to a
 * branded id; a malformed id reaching a query is a validation failure, not a bug.
 */
export function isUuidV7(value: string): boolean {
  return UUID_V7_PATTERN.test(value);
}

/**
 * Advances the timestamp and counter, guaranteeing the result is above the last.
 *
 * Three cases, and the awkward ones are the point:
 * - Time moved on: take the clock, seed a fresh counter.
 * - Same millisecond: increment. On overflow, borrow a millisecond from the future
 *   rather than block — the ids stay ordered and unique, and the timestamp is at
 *   most a millisecond optimistic.
 * - Clock moved backwards, from an NTP correction or a suspended VM: hold the last
 *   millisecond and keep incrementing. Trusting the clock here would emit ids that
 *   sort before existing rows, which is how a keyset paginator starts skipping.
 */
function nextSequencePosition(): { milliseconds: number; sequence: number } {
  const now = Date.now();

  if (now > lastMilliseconds) {
    lastMilliseconds = now;
    counter = seedCounter();

    return { milliseconds: lastMilliseconds, sequence: counter };
  }

  counter += 1;

  if (counter > MAX_COUNTER) {
    lastMilliseconds += 1;
    counter = seedCounter();
  }

  return { milliseconds: lastMilliseconds, sequence: counter };
}

/**
 * Random starting point for a millisecond's counter.
 *
 * Random rather than zero so ids created in different processes during the same
 * millisecond do not collide, and bounded below the counter's maximum so there is
 * room to increment.
 */
function seedCounter(): number {
  const seed = new Uint8Array(2);
  crypto.getRandomValues(seed);

  return new DataView(seed.buffer).getUint16(0) % COUNTER_SEED_CEILING;
}

/** Renders bytes as canonical hyphenated lowercase hex. */
function format(bytes: Uint8Array): string {
  let hex = "";

  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
