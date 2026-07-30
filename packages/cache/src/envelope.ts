/**
 * JSON envelope stored at each cache key.
 *
 * `softExpiresAt` enables stale-while-revalidate: readers past the soft TTL
 * still get the value while a single locker recomputes.
 */

export type CacheEnvelope<T> = {
  value: T;
  softExpiresAt: number;
};

export function encodeEnvelope(value: unknown, softTtlSeconds: number): string {
  const envelope: CacheEnvelope<unknown> = {
    value,
    softExpiresAt: Date.now() + softTtlSeconds * 1000,
  };
  return JSON.stringify(envelope);
}

export function decodeEnvelope<T>(raw: string): CacheEnvelope<T> | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isEnvelope(parsed)) {
      return undefined;
    }

    // Value type is caller-owned; JSON cannot prove T.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return { value: parsed.value as T, softExpiresAt: parsed.softExpiresAt };
  } catch {
    return undefined;
  }
}

export function isFresh<T>(envelope: CacheEnvelope<T>): boolean {
  return envelope.softExpiresAt > Date.now();
}

function isEnvelope(value: unknown): value is CacheEnvelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "softExpiresAt" in value &&
    typeof (value as { softExpiresAt: unknown }).softExpiresAt === "number"
  );
}
