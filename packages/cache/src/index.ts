// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export { createMemoryCache } from "./memory-cache.ts";
export { createCache } from "./redis-cache.ts";
export { buildCacheKey } from "./key.ts";
export type {
  Cache,
  CacheGetOrSetOptions,
  CacheKeyInput,
  CacheSetOptions,
  CreateCacheOptions,
} from "./types.ts";
