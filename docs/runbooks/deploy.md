# Deploy (infrastructure-agnostic)

Portable sequence for promoting immutable OCI images. This repository does **not** provision
hosts, DNS, TLS, or secret stores — bring your own orchestration (Compose on a VPS, Kubernetes,
Nomad, …).

Local proof of the same shape: `make prod-up` (Traefik + migrate-then-roll on a laptop).

---

## Prerequisites

- Images published for the git SHA: `ghcr.io/<owner>/{web,api,worker,migrate}:<sha>`
  (owner lowercased; published by `.github/workflows/publish.yml` on merge to `main`)
- Runtime secrets available to the orchestrator (see `.env.staging.example` /
  `.env.production.example` and [09 §5](../architecture/09-environment-and-secrets.md#5-runtime-variable-catalog))
- Database reachable; recent backup / PITR timestamp noted before migrate

---

## Sequence

1. **Pull** the four images for the target SHA (or let the orchestrator pull on start).
2. **Migrate** — run the migrate image to completion with `DATABASE_URL` (pool size `1` is enough).
   Exit code must be `0` before any app starts.
   ```bash
   docker run --rm --env-file .env.deploy \
     ghcr.io/<owner>/migrate:<sha>
   ```
   Compose equivalent: `docker compose run --rm migrate` (see `docker/compose.prod.yaml`).
3. **Roll** services, waiting for healthchecks between steps when possible:
   - `web` (HTTP health via reverse proxy or container `HEALTHCHECK`)
   - `api` (`GET /health`)
   - `worker` (`GET /health` on `WORKER_PORT`)
4. **Smoke**
   - Proxy / app origin returns success for a public route
   - `GET /v1/...` health or a cheap authenticated read
   - Worker health endpoint responds
5. **Watch** error rate and latency for a short window before calling the deploy done.

Migrations never run on application boot. Expand/contract migrations
([06](../architecture/06-data-and-storage.md)) keep “redeploy previous SHA” safe.

---

## Rollback

| Failure                   | Action                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| Migrate failed            | Fix forward (or restore DB from the pre-migrate backup if the migration was destructive and pre-approved) |
| App unhealthy after roll  | Redeploy the **previous** `:sha` for web/api/worker; do not rebuild                                       |
| Bad feature behind a flag | Flip the flag — no deploy                                                                                 |

Rollback of apps does **not** reverse migrations. Destructive migrations require a tested restore
plan before they are applied.

---

## Connection budget

Track this inequality for every environment; silent breach is a common outage:

```
(sum over app replicas of DATABASE_POOL_SIZE)
  + 1                  # migrate job
  + admin / tooling
  ≤ Postgres max_connections
```

Example (fill in your numbers):

| Consumer  | Replicas | Pool | Subtotal              |
| --------- | -------- | ---- | --------------------- |
| web       | _n_      | _p_  | _n × p_               |
| api       | _n_      | _p_  | _n × p_               |
| worker    | _n_      | _p_  | _n × p_               |
| migrate   | 1        | 1    | 1                     |
| admin     | —        | —    | _a_                   |
| **Total** |          |      | **≤ max_connections** |

---

## Example topologies (non-normative)

These are illustrations, not requirements of this repository.

1. **Single host + Docker Compose + reverse proxy** — closest to `docker/compose.prod.yaml`; add TLS and DNS outside the repo.
2. **Kubernetes** — Deployments for web/api/worker, Job for migrate, Ingress or Gateway API for routing.
3. **Edge web + container backend** — host `apps/web` on an edge platform; run `api`/`worker`/`migrate` on containers. Align `APP_URL`, cookie domain, and `BETTER_AUTH_URL`.

Provider modules (OpenTofu, Ansible, Cloudflare, host Traefik static config) stay in the adopter's
ops repo if desired — see [11 §3](../architecture/11-infrastructure-and-deployment.md#3-bring-your-own-infrastructure).
