# 0014 — One transport, one app, no background worker

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** platform engineering
- **Supersedes:** [0003 — One domain core behind two API transports](./0003-one-domain-core-two-transports.md),
  [0009 — BullMQ-only background work](./0009-bullmq-only-background-work.md),
  [0010 — BullMQ 6 and ioredis 6](./0010-bullmq-6-pluggable-backends.md)
- **Related:** [05 — Runtime architecture & API strategy](../architecture/05-runtime-and-api.md),
  [0013 — A kernel package plus one package per domain slice](./0013-kernel-and-slice-packages.md)

## Context

This repository is a boilerplate. It had grown to four deployable apps (`web`, `api`, `worker`,
`docs`) and twenty-six packages — roughly 32,000 lines of TypeScript. Someone starting a product from
it had to read and delete more than they wrote, and the first task on a new project was subtraction.

[ADR-0003](./0003-one-domain-core-two-transports.md) is a good decision for a product with real
third-party API consumers. Its reasoning still holds. But the second transport was costing a boilerplate
adopter an entire app, an OpenAPI drift check, a container image, a Trivy scan, an authz parity test,
and a second set of middleware — to serve consumers who, in a fresh project, do not exist yet.

`docs/starting-a-project.md` already recorded the honest numbers: `apps/api` and `apps/docs` were
**1 file to delete, 0 breaking** each, because both are top-layer and nothing imports them. The
subtraction was pre-authorised by the design; this ADR makes it the default.

The worker is a different case. Deleting it removes a _capability_, not just surface.

## Options considered

**Keep everything.** No work, and the boilerplate demonstrates more. Rejected: the cost lands on
every adopter, forever, and most of them will not need a public REST API on day one.

**Keep the REST transport, drop only the worker.** Preserves ADR-0003's central claim. Rejected
because the REST slice was the larger share of the surface and the one with the clearest "add it
back when you need it" story — the domain services it wrapped are unchanged and already exposed over
oRPC.

**Drop the REST transport, keep BullMQ behind the `JobQueue` port.** The domain depends on a port,
not on BullMQ, so this was nearly free: swap the adapter, keep `CtxPorts.jobs`, keep the seam for
re-adding a real queue. Strongly considered, and the conservative choice.

**Drop the job concept entirely.** No `@repo/jobs`, no `JobQueue` port, no `CtxPorts.jobs`. Chosen
for a smaller end state, accepting that async work moves onto the request path.

## Decision

**One app (`apps/web`), one transport (oRPC), and no background worker.**

- `apps/api`, `apps/worker`, and `apps/docs` are deleted. `docs/**` renders on GitHub; the Fumadocs
  site is gone.
- `packages/jobs` is deleted along with the `JobQueue` port and `CtxPorts.jobs`. There is no
  in-process queue adapter standing in for the removed one — the concept is gone, not stubbed.
- **The transactional outbox stays.** `writeOutboxEvent` records an event in the same transaction as
  the state change, which is the durability guarantee worth keeping; `docs/starting-a-project.md`
  §4 already warned that rebuilding it later is far more expensive than carrying it. What changed is
  delivery: `relayOutboxBatch` now dispatches to an `OutboxHandlers` registry supplied by the
  composition root, and `apps/web` drains it after a mutating request commits.
- Capabilities that earned their place moved into `apps/web`: the Stripe webhook (now applying
  events inline), `@repo/cache`, per-IP rate limiting on `/api/rpc`, `/api/health/ready`, and
  security headers on `/api/*`.
- Migrations move out of the app image into `docker/migrate.Dockerfile`, so a schema change is no
  longer coupled to an app roll.

ADR-0003's core claim — one place for business logic, transports translate — is **not** repealed.
There is simply one transport now, so the claim is untested rather than unenforced. The layered
packages that made it true are still there, and 0013 tightened them.

## Consequences

**Positive**

- Four apps and 26 packages become one app and 21. The starting point is smaller than the thing an
  adopter has to delete.
- One deployable unit, one image, one health probe, one set of middleware.
- Two real gaps in `apps/web` got closed on the way: it had no rate limiting at all (the only
  throttle was in the deleted app, and Better Auth's per-key limiter was explicitly disabled), and
  its `proxy.ts` matcher excludes `api`, so `/api/*` had been serving without security headers.
- The Stripe webhook is actually reachable now. `docker/compose.prod.yaml` routed only `/v1` and
  `/health*` to the api service, so `/webhooks/stripe` matched nothing and fell through to web.

**Negative**

- **No retries, no dead-letter queue, no backoff escalation.** A failed outbox row backs off and is
  retried by whichever request drains next. Nothing escalates, and nothing alerts.
- **Outbox rows are only drained when a later request arrives.** An event written by the last request
  of the day is delivered by the first request of the next one. Adopters who need better should run
  `relayOutboxBatch` from an external scheduler — the handler registry is the same.
- **Scheduled work has no home.** `asset.reconcile-orphans` was a cron job; `reconcileOrphanAssets`
  is deleted and reaping orphaned pending uploads is left to the adopter.
- **Email and image derivation are on the request path.** A slow SMTP server or a slow `sharp` call
  is now user-visible latency.
- Adding a public REST API back is a project, not a route file. The OpenAPI pipeline was
  Hono-registry-derived; oRPC can emit OpenAPI but through a different generator over a different
  router. That is a rewrite, not a port.
- The authz parity test is gone. It proved the same actor got the same authorization decision over
  both transports; with one transport the premise evaporates, and the guarantee now rests on every
  transport building its `Actor` through `resolveActor`.
- `make docs-build` was the only gate compiling `docs/**` as MDX. Malformed MDX and broken links in
  that tree are no longer caught.
- The API-key feature went with the REST surface (see the removal commit). `apps/web` issued keys
  that only `apps/api` consumed.

**Neutral**

- `@repo/cache` and `@repo/storage` survive; Redis is still required, now for the cache, the webhook
  replay guard, outbox side-effect claims, and Better Auth's rate limiting.
- The `perf/k6` suite shrank to the two scenarios that target web. The mutating surface is oRPC and
  is not load-tested; that gap is recorded in `perf/k6/README.md`.

## Revisit if

Third parties need API access — at which point read
[ADR-0003](./0003-one-domain-core-two-transports.md) first, because its reasoning about implementing
rules twice is unchanged and the layering that makes a second transport cheap is still in place.

Revisit the worker decision the moment either is true: a job must not be lost, or work must happen on
a schedule. Both are things the current design cannot express, and neither is a small patch.
