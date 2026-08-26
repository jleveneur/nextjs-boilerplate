# 0010 — BullMQ 6 and ioredis 6

- **Status:** Accepted
- **Date:** 2026-08-26
- **Deciders:** platform engineering
- **Related:** [ADR-0009](./0009-bullmq-only-background-work.md), [13 — Dependency review](../architecture/13-dependency-review.md#bullmq-62), risk register R9

## Context

Renovate opened a PR bumping `ioredis` 5.11.1 → 6.0.0 (#81). It failed typecheck with four instances
of `Type 'Redis<"legacy">' is not assignable to type 'ConnectionOptions'` in
`packages/jobs/src/bullmq-{queue,worker}.ts`.

The type error is a symptom of something worse. **BullMQ 5.81.3 declares `ioredis: 5.11.1` as a hard
`dependencies` entry**, not a peer. Bumping our catalog therefore does not upgrade the ioredis that
BullMQ uses — it installs a second copy and hands a v6 client instance to a library that expects a
v5 one. Two classes named `Redis`, from two package instances, are not the same type and are not
guaranteed to be interchangeable at runtime. Casting past the error would have converted a build
failure into a dual-package hazard in the queue layer.

**BullMQ 6.0.0 (2026-07-30) moves ioredis to an optional peer dependency** (`>=5.0.0`), so one copy
is shared. That is the release that makes ioredis 6 adoptable at all. The question is therefore not
"should we take ioredis 6" but "should we take BullMQ 6", and the two must move together.

BullMQ 6's headline change is the `IQueueBackend` abstraction with pluggable Redis and PostgreSQL
backends. Its breaking-change list is long, but most of it does not touch us:

| Breaking change                                                                 | Our exposure                                                                  |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Legacy repeatable jobs removed (`repeat` option, `Repeat`, `getRepeatableJobs`) | None — `apps/worker/src/schedules.ts` already uses `upsertJobScheduler`       |
| `Worker#waitUntilReady()` now resolves to `void`                                | None — the `@repo/jobs` port already types it `Promise<void>` and discards it |
| `Queue#client`, `Worker#blockingClient`, `FlowProducer#client` removed          | None — we never reach for the raw client                                      |
| `Worker#resume()` is now async                                                  | None — not called                                                             |
| `debounce` / `debounced` event removed                                          | None — not used                                                               |
| `paused` removed from `JobType` and `getJobCounts()`                            | None — not read                                                               |
| `Job#discard()` removed                                                         | None — failures use `UnrecoverableError` already                              |
| ioredis becomes an optional peer                                                | Already declared directly by `@repo/jobs`                                     |

The migration surface is empty because the `JobQueue` port in `@repo/core` was designed to keep
BullMQ's surface out of the domain (ADR-0009). This upgrade is the first real test of that boundary,
and it held: the change is two catalog version numbers and no source edits.

## Decision

Upgrade `bullmq` 5.81.3 → 6.2.2 and `ioredis` 5.11.1 → 6.0.0 together, as one change.

Group them in `renovate.json` so they can never be proposed separately again. A split PR for either
one is unmergeable by construction, and the bot should not be able to open it.

Stay on the **Redis backend**. The PostgreSQL backend is the interesting half of BullMQ 6 — it would
let us drop Redis as a queue dependency — but adopting it is a separate decision with its own
operational consequences, and nothing forces it now.

## Consequences

**Good.** ioredis 6 (RESP3, the cluster `MOVED` prototype-pollution fix, decimal serialization of
large integer arguments) becomes reachable. One ioredis copy in the tree instead of two. The
PostgreSQL backend becomes available to evaluate, which is a real answer to R9 and to the
"BullMQ cannot checkpoint waits" limitation, without committing to it today.

**Bad.** BullMQ 6 is roughly a month old at adoption. We are early, and the 6.0.x line shipped eleven
patches in its first two weeks — including `6.0.10`, which fixed ioredis being non-optional, and
`6.0.8`, which fixed a deep ioredis import. That churn is in the area we depend on.

**Neutral.** The `noeviction` operational requirement is unchanged. Telemetry adapters now require
`Meter#createGauge()`; ours is BullMQ-agnostic and unaffected.

**Revisit if** the PostgreSQL backend matures enough to remove Redis from the queue path, or if the
6.x line proves unstable — the exit remains low-medium, since `@repo/core` only sees the `JobQueue`
port.
