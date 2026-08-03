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

## Observed saturation (Phase 16 baseline)

Measured 2026-08-03 against local `make prod-up` (Traefik `:8080`, default pool
sizes from `compose.prod.yaml`: web/api pool 10, worker 5). Authenticated run used
an org API key with `metadata.userId` (Better Auth key counter disabled; app
limiter at 60 req/min).

| Signal                                | Observation                                                                              | Limiter                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| Health                                | p95 ≈ 11 ms; 0% failed (5 VUs / 20s)                                                     | Not saturated                             |
| Public `/v1` burst (40 rps, no key)   | Stable **401**; no 5xx                                                                   | Auth middleware + Traefik; not DB         |
| Authenticated burst (40 rps + key)    | Checks pass on **2xx / 429**; app returns **429** after 60 req/min/key; p95 ≈ 8 ms       | **API rate limit** before pool            |
| Read-heavy (+ authed invoice list)    | p95 ≈ 64 ms; 0% failed (10 VUs / 30s)                                                    | Not saturated on a laptop stack           |
| Write-heavy (default key permissions) | **403** on invoice create (`invoice:read` only) — authz boundary; not a capacity limiter | Authz → then rate limit if writes allowed |
| Upload stand-in (authed list)         | Concurrent reads under 3 VUs; p95 ≈ 31 ms; 429 counted as expected                       | Same API rate limit                       |

**Primary limiter for the public API today:** per-key fixed-window rate limit
(60 req/min in `apps/api/src/middleware/rate-limit.ts`). Raising that without
raising `DATABASE_POOL_SIZE` × replicas will shift saturation to the **database
pool**. Queue depth becomes the limiter for async work (email/image) under
upload/notify storms — see [queue-backlog.md](./queue-backlog.md).

Re-run and update this table after material changes to pools, rate limits, or
hardware (`make load` with `API_KEY` / `ORGANIZATION_ID`).

---

## Scale-out levers

| Bottleneck                   | Action                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| API rate limit (intentional) | Raise limit carefully; add tenant-aware quotas; cache reads                                     |
| DB pool / `max_connections`  | Fewer connections per replica, PgBouncer, or larger Postgres; never “just add replicas” blindly |
| Node event loop (CPU)        | More web/api replicas; keep Sharp/image work on the worker                                      |
| Queue depth                  | More worker replicas; split queues; fix poison messages                                         |
| Redis                        | Separate Redis for cache vs BullMQ if memory pressure appears                                   |

---

## When to run load tests

- Nightly via `.github/workflows/nightly-hardening.yml` (ephemeral compose stack)
- Before releases expected to change performance
- After changing `DATABASE_POOL_SIZE`, rate limits, or worker concurrency
