# 0007 — Split background work between BullMQ and Trigger.dev

- **Status:** Superseded by [ADR-0009](./0009-bullmq-only-background-work.md)
- **Date:** 2026-07-30
- **Deciders:** platform engineering
- **Related:** [06 §6 — Jobs](../architecture/06-data-and-storage.md#6-jobs)

## Context

The requested stack lists **both** BullMQ and Trigger.dev. They overlap substantially, and shipping
both without a rule for choosing between them would leave every future engineer guessing — which
produces the worst outcome: the same kind of work implemented in both systems.

They are not, however, interchangeable. The distinction is **durable execution**:

- **BullMQ** is a library. Your process pulls jobs from Redis and runs them. Retries, backoff,
  repeatable jobs, and priorities are provided. If the process dies mid-job, the job is retried from
  the beginning.
- **Trigger.dev** is a platform. Each run gets its own container, and execution is _durable_: a task
  can wait for hours or days without holding a process, survive restarts mid-flight, and resume from a
  checkpoint. It also provides per-run observability and replay.

The workloads a real product has genuinely span both: sending an email (short, high-volume,
latency-sensitive) is nothing like a dunning sequence that retries a payment over two weeks with
escalating emails.

## Options considered

**BullMQ only.** One system, one mental model, and Redis is already present for caching, so the
marginal infrastructure cost is zero. Long-running multi-step workflows must then be hand-built as
state machines with persisted state and re-entrant handlers — which is _exactly_ what durable
execution engines exist to provide, and hand-rolling it is a known source of subtle bugs.

**Trigger.dev only.** One system, and the more capable one. It handles the short high-volume cases too.
But it puts a platform in the path of every trivial background task: self-hosting wants roughly 3+
vCPU / 6+ GB for the webapp and 4+ vCPU / 8+ GB per worker machine, and the self-hosted build omits
warm starts, auto-scaling, and checkpoints. That is a heavy operational floor for a foundation, and it
makes "send a welcome email" depend on a platform being healthy.

**Temporal.** The gold standard for durable execution. Self-hosting requires a database cluster,
Elasticsearch, and multiple server services — considerably heavier than Trigger.dev for our scale.

**pg-boss / Graphile Worker (Postgres-backed queues).** Genuinely attractive: one less service, and
transactional enqueueing comes free because the queue is in the same database as the state change.
Lower throughput and fewer features than BullMQ. This is the strongest alternative and the one we
would choose if we wanted to drop Redis.

**A single abstraction over both.** Superficially the "clean architecture" answer. Rejected on
inspection: durable execution semantics (checkpointed waits, resumable state) **cannot be emulated on
BullMQ**, so a shared interface would either expose BullMQ's capabilities (losing the entire point of
Trigger.dev) or expose Trigger.dev's and lie about the BullMQ implementation. A leaky abstraction over
two genuinely different execution models is worse than two honest systems.

## Decision

**Keep both, split by workload class, and share only the contracts.**

The rule, which is a property of the work rather than a matter of taste:

> **Does this work need to survive process restarts mid-flight and wait for hours or days?**
> Yes → Trigger.dev. No → BullMQ.

|                | BullMQ                                                                             | Trigger.dev                                                                                      |
| -------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Use for        | Short (< 30 s), high-throughput, latency-sensitive                                 | Long, multi-step, durable                                                                        |
| Examples       | Send email, generate image derivatives, deliver webhook, reindex, invalidate cache | Dunning sequences, onboarding drips, large exports, nightly reconciliation, anything with `wait` |
| Infrastructure | Redis we already run                                                               | A platform (self-hosted or Cloud)                                                                |

**What is shared is the part that should be: `@repo/jobs` owns contracts, not execution.** A job-name
registry plus a Zod payload schema per job. Both systems consume the same contracts and validate
payloads at both ends, so a payload change is a type error at the producer. `@repo/core` only ever
sees the injected `JobQueue` port, so **either system can be deleted without touching business
logic** — which is the property an abstraction was supposed to give us, obtained without pretending
the two are the same.

**Trigger.dev ships optional and disabled by default** (`TRIGGER_ENABLED=false`), isolated in
`apps/tasks` (it needs its own project root and `trigger.config.ts`). The repository boots, tests, and
deploys with no `@trigger.dev/*` dependency, so it can be removed in one commit.

Reliability rules apply to both: idempotent handlers keyed on the payload; a **transactional outbox**
for events that must not be lost (insert the outbox row in the same transaction as the state change,
then relay); small payloads carrying identifiers rather than documents, so a retry acts on current
state; and every queue declaring concurrency, attempts, backoff, timeout, and a dead-letter queue with
an alert.

## Consequences

**Positive**

- Each workload runs on the tool suited to it, with a rule that removes the guesswork.
- The common case (short jobs) has zero marginal infrastructure cost.
- Payload contracts are typed and shared, so producer and consumer cannot drift.
- Either system is removable, because core depends on neither.
- Nothing forces the operational cost of a durable-execution platform onto a project that has no
  durable workflows.

**Negative**

- **Two systems to understand, monitor, and upgrade** — genuinely more surface than one.
- The boundary between them is a judgement call at the margin, and some jobs will be placed wrongly.
- Two sets of observability to correlate, mitigated by propagating trace context into payloads.
- If Trigger.dev is enabled and self-hosted, its operational cost is substantial and easy to
  underestimate.

**Neutral**

- BullMQ requires Redis `maxmemory-policy: noeviction`. An evicting Redis silently drops jobs, so this
  is asserted at startup rather than documented and forgotten.
- The transactional outbox is required for correctness in either system, so it is built once and
  shared.

## Revisit if

We find in practice that no workload needs durable execution — in which case Trigger.dev is deleted
and BullMQ alone remains. Or the reverse: if durable workflows become central, consolidating onto
Trigger.dev (or Temporal) and retiring BullMQ becomes the simplification. Also worth revisiting if
dropping Redis becomes attractive, at which point pg-boss replaces BullMQ and transactional
enqueueing becomes free.
