# 0009 — BullMQ-only background work

- **Status:** Accepted
- **Date:** 2026-08-03
- **Deciders:** platform engineering
- **Supersedes:** [0007 — Split background work between BullMQ and Trigger.dev](./0007-split-background-work-bullmq-triggerdev.md)
- **Related:** [06 §6 — Jobs](../architecture/06-data-and-storage.md#6-jobs)

## Context

[ADR-0007](./0007-split-background-work-bullmq-triggerdev.md) accepted a split: BullMQ for short,
high-throughput jobs and Trigger.dev for durable multi-step workflows, with Trigger.dev scaffolded
optionally in `apps/tasks` and disabled by default.

In practice, no product workload in the foundation has required durable execution — checkpointed
waits, multi-day sequences, or resumable state machines. `apps/tasks` was never scaffolded, and
maintaining Trigger.dev as an optional path adds documentation, env surface, and mental overhead
without a concrete consumer.

The parts of ADR-0007 that remain valuable — typed job contracts in `@repo/jobs`, the `JobQueue`
port, idempotent handlers, and the transactional outbox — are independent of which execution
backend runs the jobs.

## Options considered

**Keep both, as in ADR-0007.** Preserves the option to add durable workflows without a new ADR.
Rejected: the optional Trigger.dev path was never built, and keeping it in the architecture
document and dependency review implies a capability the repository does not ship.

**Trigger.dev only.** One system for all background work. Rejected for the same reasons as in
ADR-0007: heavy operational floor for short jobs, and no current workload justifies it.

**BullMQ only.** One queue system on Redis we already run. Long-running workflows, if needed later,
are implemented as state machines with persisted state and re-entrant handlers — or a durable
execution platform is adopted when a concrete workload demands it.

**Temporal / Inngest / pg-boss.** Same evaluation as ADR-0007. None are needed today; pg-boss
remains the strongest alternative if Redis is dropped.

## Decision

**Use BullMQ alone for background work. Drop Trigger.dev from the planned stack.**

- `@repo/jobs` continues to own job-name registry and Zod payload schemas.
- `@repo/core` continues to depend only on the injected `JobQueue` port.
- The transactional outbox pattern remains required for events that must not be lost.
- `apps/worker` is the sole job consumer process.

Trigger.dev and `apps/tasks` are not scaffolded. Revisit with a new ADR if durable workflows
become central to the product — for example, dunning sequences, onboarding drips with `wait`,
or large exports that must survive process restarts mid-flight.

## Consequences

**Positive**

- One system to understand, monitor, and upgrade.
- Zero marginal infrastructure beyond Redis already required for cache and queues.
- Architecture docs, env catalog, and dependency review match what the repository actually ships.
- The `JobQueue` port preserves the ability to swap or add an execution backend without touching
  business logic.

**Negative**

- Multi-step workflows that need checkpointed waits must be hand-built as persisted state machines
  until a durable platform is adopted — the class of subtle bugs ADR-0007 warned about.
- If durable workflows arrive soon, adopting Trigger.dev or Temporal will be greenfield work rather
  than flipping a feature flag.

**Neutral**

- BullMQ still requires Redis `maxmemory-policy: noeviction`.
- Reliability rules (idempotency, outbox, DLQ, graceful shutdown) are unchanged.

## Revisit if

Durable workflows become a first-class product requirement — multi-day sequences, resumable
exports, or anything that genuinely needs checkpointed `wait` semantics. At that point, evaluate
Trigger.dev, Temporal, or Inngest and write a superseding ADR. Also revisit if dropping Redis
becomes attractive, at which point pg-boss replaces BullMQ.
