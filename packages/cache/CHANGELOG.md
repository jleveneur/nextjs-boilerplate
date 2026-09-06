# @repo/cache

## 0.1.0

### Minor Changes

- 1b71268: Add `Cache.incr` — an atomic counter with a first-write TTL, backed by a single
  Redis `INCR`/`EXPIRE` Lua call.

  Counting a fixed window with `get` then `set` lets overlapping requests read the
  same value and write it back, so the ceiling holds only when requests arrive one
  at a time. `incr` is the primitive a rate limiter needs to be correct under
  concurrency and across replicas; `apps/api` now uses it.

  Counters are stored as plain integers rather than cache envelopes, so they are
  readable only through `incr` — `get` on a counter key returns `undefined`.

## 0.0.1

### Patch Changes

- db14497: Add an atomic `setIfAbsent` operation for safely claiming cache keys across concurrent requests.
- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.
