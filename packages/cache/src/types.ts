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
  /** Atomically write only when the key does not already exist. */
  setIfAbsent(input: CacheSetOptions, value: unknown): Promise<boolean>;
  /**
   * Atomically increment a counter and return its new value.
   *
   * The TTL is applied on the first increment only, so the entry expires a
   * fixed interval after the counter opened rather than sliding on every hit —
   * which is what makes this usable as a fixed-window limiter.
   *
   * Counters are stored as plain integers rather than {@link CacheEnvelope}s,
   * so they are readable only through `incr`; `get` on a counter key returns
   * `undefined`.
   */
  incr(input: CacheSetOptions): Promise<number>;
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
