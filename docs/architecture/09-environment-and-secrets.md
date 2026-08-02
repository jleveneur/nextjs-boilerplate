# 09 — Environment, configuration & secrets

---

## 1. Configuration principles

1. **Configuration comes from the environment; nothing else.** No config files per environment, no
   `if (env === "production")` branches in business logic. A branch on environment name is a
   different code path that production runs and nobody tests.
2. **Validated once, at the edge of the process.** Invalid configuration fails at build or boot,
   never at the first request that happens to need it.
3. **Typed at every access site.** `env.DATABASE_URL` is `string`, not `string | undefined`.
4. **`process.env` is accessed in exactly one package.** Everywhere else imports `@repo/env`.
5. **Server and client configuration are physically separate**, so a secret cannot reach the
   browser by mistake.
6. **The same artifact runs in every environment.** Behaviour differences come from values, so
   staging can be made to behave exactly like production for debugging.

---

## 2. `@repo/env`

### Why hand-rolled rather than `@t3-oss/env-nextjs`

The dependency bar from [01](./01-principles-and-constraints.md#6-minimal-but-powerful-dependencies)
applied honestly: this is roughly 80 lines of Zod. We need behaviour that a general-purpose library
makes awkward anyway — per-app schema composition (each app validates only the variables it
actually needs, so `apps/worker` does not require Stripe keys), a build-time skip for Docker image
builds, and coercion rules of our own. And a config layer is exactly where you least want to be
blocked by an upstream release.

### Shape

```
packages/env/src/
├── server.ts    # Secrets and server-only config. Imports "server-only".
├── client.ts    # NEXT_PUBLIC_* only. Safe in the browser.
├── shared.ts    # Present and identical in both (NODE_ENV, APP_URL, APP_ENV)
└── presets/     # Composable groups: db, redis, s3, stripe, resend, otel, posthog, sentry, auth
```

Each app composes the presets it needs:

```
// illustrative — apps/worker
export const env = createEnv({
  server: [base, db, redis, s3, resend, otel],
})
```

This is the payoff of composition over one monolithic schema: an app fails fast on _its_ missing
variables, and nothing is required to hold credentials it never uses.

### Validation rules

- **Typed coercion, not strings.** Ports and pool sizes are `z.coerce.number().int().positive()`;
  booleans are `z.enum(["true","false"]).transform(...)`, because `Boolean("false")` is `true` and
  that bug ships silently.
- **Semantic validation, not just presence.** `DATABASE_URL` must parse as a `postgres://` URL,
  `APP_URL` must be a valid absolute URL, secrets have minimum lengths.
- **Cross-field refinements.** If `TRIGGER_ENABLED=true`, then `TRIGGER_SECRET_KEY` is required.
  This is where a hand-rolled module earns its place.
- **Production-only strictness.** `refine`s that reject development defaults when `APP_ENV` is
  `production`: no `localhost` URLs, no `dev-` prefixed secrets, no `test` Stripe keys. This
  single check catches the most embarrassing class of deploy mistake.
- **Fail loudly.** Errors print every invalid variable at once with its reason — never one at a
  time, which turns a first deploy into a guessing game.
- **`SKIP_ENV_VALIDATION=1`** for Docker builds where runtime secrets are legitimately absent.
  Validation then happens at container start instead.

### Client safety

`client.ts` accepts only `NEXT_PUBLIC_`-prefixed keys, enforced by the schema itself. `server.ts`
imports `server-only`, so any client component reaching it fails the build with a clear error. A
CI check additionally greps the client bundle for known secret patterns — belt and braces, because
this failure mode is unrecoverable once published.

---

## 3. Environments

| Environment  | Purpose                 | Database                                 | Deployment                           |
| ------------ | ----------------------- | ---------------------------------------- | ------------------------------------ |
| `local`      | Development on a laptop | Docker Postgres                          | `make dev`                           |
| `test`       | Automated tests         | Ephemeral Postgres, transaction-per-test | CI + local                           |
| `preview`    | Per-pull-request review | Neon branch, seeded                      | Auto on PR, torn down on merge       |
| `staging`    | Production rehearsal    | Dedicated database, anonymised copy      | Auto on merge to `main`              |
| `production` | Real users              | Primary database, PITR                   | Manual promotion of a tagged release |

`APP_ENV` (not `NODE_ENV`) distinguishes them. `NODE_ENV` is only ever `development`, `test`, or
`production`, because framework and library behaviour depends on it and overloading it with a
fourth value breaks optimisations in subtle ways.

**Staging is a genuine rehearsal**: same images, same migration path, same Traefik configuration,
same secret mechanism. Its value is entirely in being identical; a staging environment configured
differently from production tests nothing.

**Preview environments** are where Neon's branching pays for itself: each PR gets a real database
branched from staging's schema, so migrations are exercised on realistic data before merge.

### Local development

`make setup` is idempotent and does everything: check tool versions, `pnpm install`, copy
`.env.example` → `.env.local`, start Docker services, wait for health, migrate, seed, print next
steps.

Local services in `docker/compose.yaml`: PostgreSQL 18, Redis, MinIO (with the bucket
pre-created), Mailpit (SMTP catcher with a web UI so email is inspectable without sending),
OTel collector (OTLP → Jaeger traces + Prometheus metrics), Jaeger UI, Prometheus, and Grafana.
Host ports: Postgres `55432`, Redis `55434`, Jaeger `55443`, OTLP `55444`/`55445`, Prometheus
`55447`, Grafana `55448`.

`.env.example` is committed, exhaustively commented, and contains working defaults for every local
service. It is the reference for what exists; a variable added without a documented entry there is
treated as incomplete work.

---

## 4. Secrets management

**This repository does not ship encrypted secret trees.** Runtime secrets are injected by the
adopter's platform (Compose env files, Kubernetes Secrets, a cloud secret manager, CI OIDC, …).
`.gitignore` covers every `.env*` except the committed `*.example` files, and Gitleaks runs
pre-commit and in CI.

Placeholder catalogs for non-local targets: [`.env.staging.example`](../../.env.staging.example)
and [`.env.production.example`](../../.env.production.example). Never commit real values.

### Recommended pattern for adopters (illustrative)

**SOPS + age** is a strong default when you want secrets versioned beside the code that needs them:
reviewable diffs (values encrypted, keys visible), no service to run, no vendor, identical in CI and
on hosts, rollback is a git revert. Alternatives (Vault, cloud secret managers, GitHub Secrets alone)
each trade operational weight or auditability — pick for your organisation, not because this repo
requires one.

If you adopt SOPS + age, a typical layout _outside or beside_ the app repo looks like:

```
secrets/                    # adopter-owned; not required in this boilerplate
├── .sops.yaml
├── staging.enc.yaml
├── production.enc.yaml
└── shared.enc.yaml
```

### Rotation (guidance)

| Secret                                 | Cadence                            | Notes                                       |
| -------------------------------------- | ---------------------------------- | ------------------------------------------- |
| Database passwords                     | 90 days                            | Requires a coordinated restart              |
| API keys (outbound: Stripe, Resend, …) | 180 days, immediately on suspicion | Providers support overlapping keys          |
| Auth signing secret                    | 180 days                           | Rotating invalidates sessions — schedule it |
| Customer API keys                      | Customer-controlled                | Overlapping keys supported                  |

Rotation should be a documented runbook with blast radius stated for each secret.

---

## 5. Runtime variable catalog

Source of truth: composable presets in `packages/env/src/presets/`. Each app validates **only**
the presets it imports. Placeholder files:

| File                                                       | Purpose                     |
| ---------------------------------------------------------- | --------------------------- |
| [`.env.example`](../../.env.example)                       | Local laptop (`make setup`) |
| [`.env.staging.example`](../../.env.staging.example)       | Staging-shaped deploy       |
| [`.env.production.example`](../../.env.production.example) | Production-shaped deploy    |

### Shared / base (every process)

| Variable    | Kind    | Notes                                                       |
| ----------- | ------- | ----------------------------------------------------------- |
| `NODE_ENV`  | runtime | `development` \| `test` \| `production` only                |
| `APP_ENV`   | runtime | `local` \| `test` \| `preview` \| `staging` \| `production` |
| `APP_URL`   | runtime | Canonical origin, no trailing slash                         |
| `LOG_LEVEL` | runtime | Default `info`                                              |

### Database (`db` preset) — web, api (incl. migrate job), worker

| Variable             | Kind           | Notes                                         |
| -------------------- | -------------- | --------------------------------------------- |
| `DATABASE_URL`       | runtime secret | `postgres://` or `postgresql://`              |
| `DATABASE_POOL_SIZE` | runtime        | Positive int; default `10`. Migrate uses `1`. |

### Redis (`redis`) — web, api, worker

| Variable    | Kind           | Notes                     |
| ----------- | -------------- | ------------------------- |
| `REDIS_URL` | runtime secret | `redis://` or `rediss://` |

### Auth (`auth`) — web, api

| Variable                                 | Kind           | Notes                                  |
| ---------------------------------------- | -------------- | -------------------------------------- |
| `BETTER_AUTH_SECRET`                     | runtime secret | ≥ 32 characters                        |
| `BETTER_AUTH_URL`                        | runtime        | Usually same origin as the web app     |
| `GITHUB_*` / `GOOGLE_*`                  | runtime secret | Optional; providers skipped when unset |
| `TRIGGER_ENABLED` / `TRIGGER_SECRET_KEY` | runtime        | Optional durable-jobs gate             |

### Email (`resend` + optional `smtp`) — web, api, worker

| Variable          | Kind           | Notes                                          |
| ----------------- | -------------- | ---------------------------------------------- |
| `RESEND_API_KEY`  | runtime secret | Must start with `re_`                          |
| `EMAIL_FROM`      | runtime        | Valid email                                    |
| `SMTP_URL`        | runtime        | Optional; preferred when set (Mailpit locally) |
| `MAILPIT_API_URL` | runtime        | Optional local inspection                      |

### Object storage (`s3`) — web, worker

| Variable                                    | Kind           | Notes                                        |
| ------------------------------------------- | -------------- | -------------------------------------------- |
| `S3_ENDPOINT`                               | runtime        | Required so the client never defaults to AWS |
| `S3_REGION`                                 | runtime        | Default `auto`                               |
| `S3_BUCKET`                                 | runtime        | Bucket name                                  |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | runtime secret | S3 API credentials                           |

### Public client (`publicApp` + optional analytics/error presets)

| Variable                                           | Kind           | Notes                                       |
| -------------------------------------------------- | -------------- | ------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                              | **build-time** | Baked into the web / docs images            |
| `NEXT_PUBLIC_APP_ENV`                              | **build-time** | Baked into the web / docs images            |
| `NEXT_PUBLIC_POSTHOG_*` / `NEXT_PUBLIC_SENTRY_DSN` | **build-time** | Only when those client presets are composed |

### Observability / payments presets (composed when wired — Phase 14/17)

| Variable                                                             | Kind           | Notes                                        |
| -------------------------------------------------------------------- | -------------- | -------------------------------------------- |
| `OTEL_ENABLED` / `OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_SERVICE_NAME` | runtime        | Off by default                               |
| `SENTRY_ENABLED` / `SENTRY_DSN` / `SENTRY_RELEASE`                   | runtime        | Off by default                               |
| `POSTHOG_API_KEY` / `POSTHOG_HOST`                                   | runtime        | Server capture                               |
| `FLAGS_JSON`                                                         | runtime        | Env flag overrides (`@repo/flags`)           |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`                        | runtime secret | Rejected test keys when `APP_ENV=production` |

### Process ports (app-local)

| Variable                         | App    | Default         |
| -------------------------------- | ------ | --------------- |
| `PORT` / `HOSTNAME`              | web    | Next standalone |
| `API_PORT`                       | api    | `3001`          |
| `WORKER_PORT` / `OUTBOX_POLL_MS` | worker | `3002` / `1000` |

### Validation skip

| Variable                | When                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `SKIP_ENV_VALIDATION=1` | **Image build only** — secrets are legitimately absent. Validation is mandatory at container/process start. |

Production strictness (`APP_ENV=production`): no localhost URLs, no `dev-` secret prefixes, no Stripe test keys — see `packages/env/src/production.ts`.

---

## 6. Build-time versus runtime configuration

An easy thing to get wrong with Next.js, and expensive to discover late.

| Kind           | Examples                                                        | When read     | Consequence                                |
| -------------- | --------------------------------------------------------------- | ------------- | ------------------------------------------ |
| **Build-time** | `NEXT_PUBLIC_*` (inlined into the bundle), build metadata       | `next build`  | Changing the value requires a rebuild      |
| **Runtime**    | `DATABASE_URL`, all secrets, feature-flag defaults, `LOG_LEVEL` | Process start | Changing the value requires only a restart |

Consequence for the image strategy: **`NEXT_PUBLIC_*` values are baked into the image**, so an
image is tied to the public configuration it was built with. We therefore keep the
`NEXT_PUBLIC_*` set deliberately minimal (app URL, PostHog key, Sentry DSN) and everything else at
runtime, so **one image can be promoted from staging to production unchanged** — which is the
property the whole deployment strategy depends on. Where a public value must differ per
environment, it is served from a runtime-read endpoint rather than inlined.
