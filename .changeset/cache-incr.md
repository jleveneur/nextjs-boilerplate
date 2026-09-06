---
"@repo/cache": minor
---

Add `Cache.incr` — an atomic counter with a first-write TTL, backed by a single
Redis `INCR`/`EXPIRE` Lua call.

Counting a fixed window with `get` then `set` lets overlapping requests read the
same value and write it back, so the ceiling holds only when requests arrive one
at a time. `incr` is the primitive a rate limiter needs to be correct under
concurrency and across replicas; `apps/api` now uses it.

Counters are stored as plain integers rather than cache envelopes, so they are
readable only through `incr` — `get` on a counter key returns `undefined`.
