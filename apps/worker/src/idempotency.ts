import { randomUUID } from "node:crypto";

const PROCESSING_TTL_SECONDS = 60 * 15;
const COMPLETED_TTL_SECONDS = 60 * 60 * 24 * 7;
const COMPLETED_VALUE = "completed";

const COMPLETE_IF_OWNED_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
  return 1
end
return 0
`;

const RELEASE_IF_OWNED_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

export interface JobIdempotencyRedis {
  set(
    key: string,
    value: string,
    expiryMode: "EX",
    ttlSeconds: number,
    setMode: "NX",
  ): Promise<"OK" | null>;
  get(key: string): Promise<string | null>;
  eval(script: string, numberOfKeys: 1, key: string, ...args: readonly string[]): Promise<unknown>;
}

export type JobIdempotencyLease =
  | { status: "claimed"; token: string }
  | { status: "completed" }
  | { status: "in_progress" };

function redisKey(idempotencyKey: string): string {
  return `job:idempotency:${idempotencyKey}`;
}

async function claimAvailableLease(
  redis: JobIdempotencyRedis,
  key: string,
  token: string,
): Promise<JobIdempotencyLease> {
  const result = await redis.set(key, token, "EX", PROCESSING_TTL_SECONDS, "NX");
  if (result === "OK") {
    return { status: "claimed", token };
  }

  const currentValue = await redis.get(key);
  if (currentValue === COMPLETED_VALUE) {
    return { status: "completed" };
  }
  if (currentValue !== null) {
    return { status: "in_progress" };
  }

  return claimAvailableLease(redis, key, token);
}

export function beginJobIdempotency(
  redis: JobIdempotencyRedis,
  idempotencyKey: string,
): Promise<JobIdempotencyLease> {
  return claimAvailableLease(redis, redisKey(idempotencyKey), `processing:${randomUUID()}`);
}

export async function completeJobIdempotency(
  redis: JobIdempotencyRedis,
  idempotencyKey: string,
  token: string,
): Promise<void> {
  const result = await redis.eval(
    COMPLETE_IF_OWNED_SCRIPT,
    1,
    redisKey(idempotencyKey),
    token,
    COMPLETED_VALUE,
    String(COMPLETED_TTL_SECONDS),
  );
  if (result !== 1) {
    throw new Error("idempotency lease lost before completion");
  }
}

export async function releaseJobIdempotency(
  redis: JobIdempotencyRedis,
  idempotencyKey: string,
  token: string,
): Promise<void> {
  await redis.eval(RELEASE_IF_OWNED_SCRIPT, 1, redisKey(idempotencyKey), token);
}
