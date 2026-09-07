# Security review

Checklist for authorization, tenant isolation, secrets, headers, and automated scanning.
Executable tests remain the source of truth; this document links evidence.

CSP and HSTS are **adopter / reverse-proxy** concerns at the TLS edge. This boilerplate sets
baseline headers from one source
([`apps/web/src/lib/security-headers.ts`](../../apps/web/src/lib/security-headers.ts)), applied
twice: `next.config.ts` `headers()` covers every route including `/api/*`, and
[`apps/web/src/proxy.ts`](../../apps/web/src/proxy.ts) covers the responses it produces itself.
Both are needed — the proxy matcher excludes `api`, and middleware-produced redirects do not pass
through `headers()`.

Related: [authorization matrix](./authorization-matrix.md), [accessibility audit](./accessibility-audit.md).

---

## Checklist

| Area                                 | Status             | Evidence                                                                                                                                                                                       |
| ------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization matrix (role × action) | Automated          | [authorization-matrix.md](./authorization-matrix.md), [`packages/authz/src/can.test.ts`](../../packages/authz/src/can.test.ts)                                                                 |
| Transport parity                     | N/A                | One transport ([ADR-0014](../adr/0014-single-transport-and-no-background-worker.md)). Every entry point builds its `Actor` through `resolveActor`, which is what the parity test used to prove |
| Tenant isolation in repositories     | Automated          | Slice + db integration tests (billing, assets)                                                                                                                                                 |
| Secrets only via `@repo/env`         | Automated + policy | [09](../architecture/09-environment-and-secrets.md), Gitleaks in CI/hooks                                                                                                                      |
| No secrets in client bundles         | Policy             | `server-only` on server env; knip/layer `runtime: browser` ban                                                                                                                                 |
| Security headers (web)               | Implemented        | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`                                                                                                           |
| Security headers (`/api/*`)          | Implemented        | Same set, via `next.config.ts` `headers()`. Previously **absent** — the proxy matcher excludes `api`                                                                                           |
| CSP / HSTS                           | Adopter edge       | Not shipped as an app CSP; set at the TLS reverse proxy when an adopter is ready                                                                                                               |
| Dependency / SAST / images           | CI                 | `pnpm audit`+Renovate, CodeQL, Trivy on images                                                                                                                                                 |
| OWASP ZAP baseline                   | Nightly            | `make zap`, `.github/workflows/nightly-hardening.yml`                                                                                                                                          |
| Load / saturation                    | Nightly + runbook  | `make load`, [scaling.md](../runbooks/scaling.md). **Read-only paths only** — the oRPC mutating surface is not load-tested                                                                     |
| Rate limiting (`/api/rpc`)           | Automated          | Per-IP, 300 req/min, ahead of session resolution; [`apps/web/src/server/rate-limit.test.ts`](../../apps/web/src/server/rate-limit.test.ts)                                                     |
| Post-auth redirect targets           | Automated          | [`apps/web/src/features/auth/auth-utils.ts`](../../apps/web/src/features/auth/auth-utils.ts) — off-origin `next` rejected                                                                      |

---

## Manual follow-ups (not merge blockers)

- Authenticated ZAP / exploratory testing of session logout, impersonation, CSRF on cookie flows
- Review of staging/production secret stores and rotation runbooks
- CSP rollout behind report-only at the reverse proxy when an adopter is ready

---

## Findings / accepted risks

The table below is a log, kept append-only. Several entries predate
[ADR-0014](../adr/0014-single-transport-and-no-background-worker.md), which removed the public REST
API and the API-key credential; their current status:

- **P16-1, P16-2, P17-2** — moot. The API-key feature is gone, along with the Better Auth `apiKey`
  plugin and `resolveActorFromApiKey`.
- **P17-1** — the fix survives. `apps/web`'s per-IP limiter counts through the same atomic
  `Cache.incr`, and the concurrency regression is re-asserted in
  [`apps/web/src/server/rate-limit.test.ts`](../../apps/web/src/server/rate-limit.test.ts) after the
  original `apps/api` test was deleted with the app.
- **P17-3** — the webhook half of the fix survives and is re-implemented in
  `apps/web/src/app/api/webhooks/stripe/route.ts`: the replay claim is released on any failure. The
  `Idempotency-Key` half does **not** — there is no idempotency middleware anywhere now.

| ID    | Severity | Finding                                                                                                                                                                             | Disposition                                                                                                                                                                    |
| ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P16-1 | Medium   | Better Auth API-key plugin defaulted to **10 req/day** and surfaced as HTTP 401 when exceeded                                                                                       | Fixed: `rateLimit.enabled: false` in `@repo/auth`; app limiter remains 60 req/min in `apps/api`                                                                                |
| P16-2 | Low      | Org API keys without `metadata.userId` resolve as invalid (`resolveActorFromApiKey`)                                                                                                | Documented in `perf/k6/README.md`; creators must set `metadata.userId`                                                                                                         |
| P17-1 | High     | Per-key limiter read-modify-wrote its counter, so overlapping requests all observed the same count and the 60 req/min ceiling was not enforced under concurrency or across replicas | Fixed: counts through an atomic `Cache.incr` (Redis `INCR` + first-write `EXPIRE`, one Lua call). Regression test asserts exactly 60 of 80 overlapping requests pass           |
| P17-2 | Medium   | The only limiter ran **after** API-key auth, leaving requests with an invalid key unmetered — an unauthenticated caller could drive an unbounded number of key lookups              | Fixed: a per-IP limiter (300 req/min) mounted ahead of `apiKeyAuthMiddleware`. Buckets on the last `X-Forwarded-For` entry, which a client cannot forge past one trusted proxy |
| P17-3 | Medium   | Stripe webhook held its replay claim through a failed enqueue, so a retry inside the 5-minute pending TTL was answered `replay: true` and the event was dropped                     | Fixed: the claim is released on failure so the 500 lets Stripe retry. Same fix applied to the `Idempotency-Key` claim on a thrown handler or 5xx                               |
