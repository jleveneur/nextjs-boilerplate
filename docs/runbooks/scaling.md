# Scaling

How to grow capacity once load tests show a bottleneck. Saturation findings come from
`make load` (k6) against the prod-like stack or staging — see [`perf/k6/`](../../perf/k6/).

---

## Connection budget (always)

Before adding replicas, check the Postgres budget in [deploy.md](./deploy.md):

```
(sum over app replicas of DATABASE_POOL_SIZE)
  + 1                  # migrate job
  + admin / tooling
  ≤ Postgres max_connections
```

Silent breach of this inequality is a common outage mode (`too many clients` —
[db-connections-exhausted.md](./db-connections-exhausted.md)).

---

## Observed saturation (hardening baseline)

Measured 2026-08-03 against local `make prod-up` (Traefik `:8080`, default pool
sizes from `compose.prod.yaml`: web/api pool 10, worker 5). Authenticated run used
unauthenticated read-only traffic against the prod-like stack.

| Signal                    | Observation                           | Limiter                         |
| ------------------------- | ------------------------------------- | ------------------------------- |
| Health                    | p95 ≈ 11 ms; 0% failed (5 VUs / 20s)  | Not saturated                   |
| Read-heavy (public pages) | p95 ≈ 64 ms; 0% failed (10 VUs / 30s) | Not saturated on a laptop stack |

**Primary limiter today:** a per-IP fixed-window rate limit on `/api/rpc`
(300 req/min in `apps/web/src/server/rate-limit.ts`), mounted ahead of session
resolution so unauthenticated traffic cannot drive database round trips without
a ceiling. It is an abuse bound, not a quota, and a legitimate tenant should
never reach it. It counts through an atomic Redis counter, so the ceiling holds
across replicas rather than per process.

**The numbers above only cover read-only, unauthenticated traffic.** The
mutating surface is oRPC (`POST /api/rpc`, batched) and is not load-tested — see
the coverage gap in `perf/k6/README.md`. Raising the limit without raising
`DATABASE_POOL_SIZE` × replicas will shift saturation to the **database pool**.

**Async work has no separate limiter, and that is the risk to watch.** With no
worker, outbox handlers (email, image derivation) run inside whichever request
drains the outbox, so an upload or notify storm shows up as request latency
rather than as queue depth. There is no queue dashboard to look at.

Re-run and update this table after material changes to pools, rate limits, or
hardware (`make load` with `API_KEY` / `ORGANIZATION_ID`).

---

## Scale-out levers

| Bottleneck                   | Action                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| API rate limit (intentional) | Raise limit carefully; add tenant-aware quotas; cache reads                                     |
| DB pool / `max_connections`  | Fewer connections per replica, PgBouncer, or larger Postgres; never “just add replicas” blindly |
| Node event loop (CPU)        | More web replicas. Sharp now runs in the outbox drain, so image storms compete with requests    |
| Redis                        | `noeviction` is required — it holds replay guards and side-effect claims, not just cache        |

---

## When to run load tests

- Nightly via `.github/workflows/nightly-hardening.yml` (ephemeral compose stack)
- Before releases expected to change performance
- After changing `DATABASE_POOL_SIZE`, rate limits, or worker concurrency
