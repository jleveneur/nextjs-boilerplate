export type CacheKeyInput = {
  /** Logical area, e.g. `entitlements`, `session`. */
  namespace: string;
  /** Bump to invalidate an entire namespace without a flush. */
  version: number;
  /** Caller-chosen suffix — never includes the env/namespace prefix. */
  key: string;
  /** Required for tenant-scoped entries. */
  organizationId?: string;
};

export type CacheSetOptions = CacheKeyInput & {
  /** Every entry must expire — no infinite keys. */
  ttlSeconds: number;
};

export type CacheGetOrSetOptions<T> = CacheSetOptions & {
  factory: () => Promise<T>;
  /** Soft TTL for stale-while-revalidate. Defaults to half of `ttlSeconds`. */
  softTtlSeconds?: number;
  /** Lock hold time while recomputing. Defaults to 5 seconds. */
  lockSeconds?: number;
};

/**
 * Cache surface. There is no way to write an unprefixed key — every method
 * goes through {@link CacheKeyInput}.
 */
export type Cache = {
  get<T>(input: CacheKeyInput): Promise<T | undefined>;
  set(input: CacheSetOptions, value: unknown): Promise<void>;
  del(input: CacheKeyInput): Promise<void>;
  getOrSet<T>(input: CacheGetOrSetOptions<T>): Promise<T>;
  /** Close underlying connections. No-op for in-memory fakes. */
  close(): Promise<void>;
};

export type CreateCacheOptions = {
  redisUrl: string;
  /** `APP_ENV` — first segment of every key. */
  appEnv: string;
};
