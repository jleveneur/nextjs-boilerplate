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

Measured against local `make prod-up` (Traefik `:8080`, default pool sizes from
`compose.prod.yaml`: web/api pool 10, worker 5).

| Signal                               | Observation                                                                                        | Limiter                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Health + read-heavy p95              | Stays under k6 thresholds (500 ms health / 2 s pages) at modest VUs                                | Not saturated on a laptop stack            |
| Public `/v1` burst (40 rps, no key)  | Stable **401** responses; no 5xx                                                                   | Auth middleware + Traefik; not DB          |
| Authenticated burst (with `API_KEY`) | Hits **429** at 60 req/min/key (`apps/api` rate limiter)                                           | **API rate limit** before pool             |
| Write-heavy (authenticated creates)  | Bound by rate limit and validation; pool stays well below `max_connections` on single-node compose | Rate limit → then DB pool if limits raised |

**Primary limiter for the public API today:** per-key fixed-window rate limit
(60 req/min in `apps/api/src/middleware/rate-limit.ts`). Raising that without
raising `DATABASE_POOL_SIZE` × replicas will shift saturation to the **database
pool**. Queue depth becomes the limiter for async work (email/image) under
upload/notify storms — see [queue-backlog.md](./queue-backlog.md).

Re-run and update this table after material changes to pools, rate limits, or
hardware (`make load`, optionally with `API_KEY` / `ORGANIZATION_ID`).

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
