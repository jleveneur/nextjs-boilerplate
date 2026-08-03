# Phase 16 — Security review

Checklist for authorization, tenant isolation, secrets, headers, and automated scanning.
Executable tests remain the source of truth; this document links evidence.

CSP and HSTS are **adopter / reverse-proxy** concerns at the TLS edge. This boilerplate sets
baseline headers on web HTML ([`apps/web/src/proxy.ts`](../../apps/web/src/proxy.ts)) and on every
API response ([`apps/api/src/middleware/security-headers.ts`](../../apps/api/src/middleware/security-headers.ts)).

---

## Checklist

| Area                                 | Status             | Evidence                                                                                                                       |
| ------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Authorization matrix (role × action) | Automated          | [authorization-matrix.md](./authorization-matrix.md), [`packages/authz/src/can.test.ts`](../../packages/authz/src/can.test.ts) |
| Transport parity (tRPC = REST authz) | Automated          | [`apps/api/src/authz-parity.integration.test.ts`](../../apps/api/src/authz-parity.integration.test.ts)                         |
| Tenant isolation in repositories     | Automated          | Core/db integration tests (billing, assets)                                                                                    |
| Secrets only via `@repo/env`         | Automated + policy | [09](../architecture/09-environment-and-secrets.md), Gitleaks in CI/hooks                                                      |
| No secrets in client bundles         | Policy             | `server-only` on server env; knip/layer `runtime: browser` ban                                                                 |
| Security headers (web)               | Implemented        | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`                                           |
| Security headers (api)               | Implemented        | Same set; unit test in `security-headers.test.ts`                                                                              |
| CSP / HSTS                           | Adopter edge       | Documented here — not shipped as app CSP in Phase 16                                                                           |
| Dependency / SAST / images           | CI                 | `pnpm audit`+Renovate, CodeQL, Trivy on images                                                                                 |
| OWASP ZAP baseline                   | Nightly            | `make zap`, `.github/workflows/nightly-hardening.yml`                                                                          |
| Load / saturation                    | Nightly + runbook  | `make load`, [scaling.md](../runbooks/scaling.md)                                                                              |

---

## Manual follow-ups (not merge blockers)

- Authenticated ZAP / exploratory testing of session logout, impersonation, CSRF on cookie flows
- Review of staging/production secret stores and rotation runbooks
- CSP rollout behind report-only at the reverse proxy when an adopter is ready

---

## Findings / accepted risks

| ID    | Severity | Finding                                                                                       | Disposition                                                                                     |
| ----- | -------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| P16-1 | Medium   | Better Auth API-key plugin defaulted to **10 req/day** and surfaced as HTTP 401 when exceeded | Fixed: `rateLimit.enabled: false` in `@repo/auth`; app limiter remains 60 req/min in `apps/api` |
| P16-2 | Low      | Org API keys without `metadata.userId` resolve as invalid (`resolveActorFromApiKey`)          | Documented in `perf/k6/README.md`; creators must set `metadata.userId`                          |
