# 02 — Repository topology

---

## 1. Top level

```
.
├── apps/                    # Deployable units. Thin. No business logic.
├── packages/                # Everything reusable. Where the code actually lives.
├── tooling/                 # Shared build/lint/test configuration, published to nobody.
├── docker/                  # Dockerfiles + compose stacks (deps, prod-like, test, e2e).
├── docs/                    # Architecture, ADRs, runbooks, security review (this folder).
├── perf/                    # k6 load scenarios + ZAP baseline config (not PR CI).
├── scripts/                 # Repo automation (layers, restore-drill, budgets, …).
├── .github/                 # Workflows, templates, CODEOWNERS.

├── .cursor/rules/           # Machine-readable architecture rules for AI agents.
├── .vscode/                 # Recommended settings + extensions.
├── Makefile                 # The single human entry point.
├── turbo.json               # Task graph.
├── pnpm-workspace.yaml       # Workspace globs + dependency catalog.
├── package.json             # Root scripts only; no runtime dependencies.
├── lefthook.yml             # Git hooks.
├── .oxlintrc.json           # Lint config (extends tooling/oxlint).
├── .oxfmtrc.json            # Format config.
├── cspell.config.yaml       # Spell checker.
├── knip.json                # Unused code/dependency detection.
├── renovate.json5           # Dependency updates.
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .env.example
├── .env.staging.example     # Placeholder catalog for staging-shaped deploys
└── .env.production.example  # Placeholder catalog for production-shaped deploys
```

Why these five top-level folders and not more: each answers a distinct question — _what ships_
(`apps`), _what is shared_ (`packages`), _what configures the build_ (`tooling`), _what builds
images_ (`docker`), _what explains them_ (`docs`). Provider-specific IaC (OpenTofu, Ansible, host
Traefik, encrypted secret trees) is an **adopter concern**, not a required tree in this
boilerplate — see [11 §3](./11-infrastructure-and-deployment.md#3-bring-your-own-infrastructure)
and [docs/runbooks/deploy.md](../runbooks/deploy.md).

---

## 2. `apps/` — deployable units

An app is a **composition root**: it reads configuration, constructs adapters, injects them into
core services, exposes a transport, and shuts down cleanly. Apps contain wiring, routing,
presentation, and nothing else.

```
apps/
├── web/          Next.js 16 — the product. RSC UI, tRPC handler, auth handler, Server Actions.
├── api/          Hono — public REST /v1, OpenAPI document, Scalar reference, inbound webhooks.
├── worker/       Node service — BullMQ consumers, repeatable schedules.
├── tasks/        Trigger.dev tasks — durable workflows. Optional; disabled by default.
└── docs/         Fumadocs — public documentation site, embeds the API reference.
```

### `apps/web`

```
apps/web/
├── src/
│   ├── app/                        # ROUTING ONLY. No logic beyond composition.
│   │   ├── [locale]/
│   │   │   ├── (marketing)/        # Public, statically cached
│   │   │   ├── (auth)/             # sign-in, sign-up, reset, verify
│   │   │   └── (app)/              # Authenticated product
│   │   │       └── [orgSlug]/      # Tenant-scoped surface
│   │   ├── api/
│   │   │   ├── trpc/[trpc]/        # tRPC fetch adapter
│   │   │   └── auth/[...all]/      # Better Auth handler
│   │   ├── layout.tsx
│   │   └── global-error.tsx
│   ├── features/                   # Client-side feature modules (see §5)
│   ├── components/                 # App-specific composites; primitives live in @repo/ui
│   ├── server/
│   │   ├── context.ts              # Builds the request Ctx (actor, adapters, logger)
│   │   ├── container.ts            # Composition root: wires ports to adapters
│   │   └── router.ts               # Root tRPC router: merges feature routers
│   ├── messages/                   # next-intl catalogs (`en.json`, `fr.json`)
│   ├── styles/
│   └── proxy.ts                    # Next 16 proxy (formerly middleware.ts)
├── e2e/                            # Playwright + axe specs (`make e2e`)
├── lighthouserc.cjs                # LHCI budgets (`make lighthouse`)
├── playwright.config.ts
├── next.config.ts
└── package.json
```

OTel/Sentry `instrumentation*.ts` land in Phase 14; Phase 8 boots without them.

`app/` mirrors URLs and nothing else. The moment a route file exceeds composition — fetch data,
render, handle a form submission by delegating — the logic belongs in `features/` (client) or
`@repo/core` (server).

> **Next 16 specifics that shape this layout:** `proxy.ts` replaces `middleware.ts` and runs on
> the Node runtime (so no Edge-compatibility constraints, but also no excuse to do
> authorization there); `cacheComponents: true` with explicit `use cache` replaces implicit
> caching, so caching becomes a deliberate per-boundary decision; `turbopack` config moved to
> top level; `revalidateTag(tag, profile)` / `updateTag(tag)` replace the old single-argument
> form.

### `apps/api`

```
apps/api/
├── src/
│   ├── index.ts                  # @hono/node-server bootstrap + SIGTERM
│   ├── app.ts                    # Hono app: health, /v1, webhooks, Scalar, OpenAPI
│   ├── env.ts
│   ├── openapi-generate.ts       # Writes committed openapi.json (no DB)
│   ├── server/
│   │   ├── container.ts          # Composition root (db, auth, cache, ports)
│   │   └── ports.ts
│   ├── middleware/               # request-id, API-key auth, rate limit, idempotency, errors
│   ├── routes/v1/                # @hono/zod-openapi invoice routes
│   └── webhooks/                 # stripe.ts — signature verify + replay stub
├── openapi.json                  # Committed snapshot; `make openapi-check` / CI
└── package.json
```

Separate from `apps/web` for three reasons that each matter independently: it scales and fails
independently of the UI; it has a different auth model (API keys, not cookies); and its
versioned contract must be able to stay stable while the UI changes daily.

### `apps/worker`

```
apps/worker/
├── src/
│   ├── index.ts             # Bootstrap: workers, schedulers, graceful shutdown, health port
│   ├── container.ts
│   ├── outbox-relay.ts      # Poll pending outbox → enqueue → mark published
│   ├── consumers/           # One file per job; each maps payload → core service call
│   └── schedules.ts         # Repeatable jobs (cron) with stable scheduler ids
└── package.json
```

Consumers are transports too: parse the payload with the shared Zod contract, resolve a system
actor, call a core service. Retry/backoff policy is declared per queue, and a dead-letter queue
plus alert is mandatory for every queue.

### `apps/tasks` (optional)

Trigger.dev requires its own project root with `trigger.config.ts`. Isolating it means the rest
of the repo has no `@trigger.dev/*` dependency and the app can be deleted in one commit if you
choose not to use it.

### `apps/docs`

Fumadocs site on port **3003**. `scripts/prepare-content.ts` syncs
`docs/{architecture,adr,runbooks}` into gitignored MDX at build/dev time; hand-written guides
(`getting-started`, `contributing`) live under `content/docs/`. Embeds the Scalar API reference
from the committed `apps/api/openapi.json`. Documentation the team already writes becomes the
published site, so there is only one copy. Image: `docker/docs.Dockerfile` → `repo-docs`.

---

## 3. `packages/` — where the code lives

Grouped by layer (see [03](./03-package-graph-and-boundaries.md) for the rules).

### Layer 0 — foundation (browser-safe, zero runtime deps beyond Zod)

| Package           | Responsibility                                                                                                     | Must not                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `@repo/types`     | Shared utility types and branded primitives (`OrganizationId`, `UserId`). Types only, no runtime code.             | Contain any value export                             |
| `@repo/utils`     | Small pure helpers: `invariant`, `assertNever`, id generation, slugify, cursor encoding.                           | Perform I/O or import env                            |
| `@repo/env`       | Zod-validated environment schemas, split `server` / `client` / `shared`.                                           | Be imported by `@repo/utils`                         |
| `@repo/errors`    | `AppError` base, error codes registry, severity, HTTP/problem-details mapping.                                     | Import a logger or transport                         |
| `@repo/contracts` | Zod schemas + inferred DTOs for everything crossing a wire. The shared vocabulary of client, tRPC, REST, and jobs. | Import `@repo/db` or any adapter                     |
| `@repo/i18n`      | Locale list, routing config, formatting helpers shared by web and email.                                           | Contain message catalogs (those live with their app) |

`@repo/contracts` is the keystone of the "one core, two transports" design: it is the only
package that both the browser and every server surface may import, so it is where request and
response shapes are defined once.

### Layer 1 — platform adapters (server-only)

| Package               | Responsibility                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@repo/logger`        | Pino instance factory, redaction, request-scoped child loggers via `AsyncLocalStorage`, trace-id correlation.                          |
| `@repo/observability` | OTel SDK setup, Sentry init, span helpers, trace/log/error correlation.                                                                |
| `@repo/db`            | Drizzle schema (one file per module), client factory, pool config, migrations, seeds, transaction helper, tenant-scoped query helpers. |
| `@repo/cache`         | Redis client, namespaced keys, TTL policy, stampede protection, tag invalidation.                                                      |
| `@repo/storage`       | S3 API client, presigned upload/download, key conventions, Sharp derivative pipeline.                                                  |
| `@repo/email`         | Resend adapter + React Email templates + a preview dev server; a `NoopMailer` for tests.                                               |
| `@repo/payments`      | Stripe adapter: catalog sync, checkout/portal sessions, webhook handlers, entitlement mapping.                                         |
| `@repo/jobs`          | Job **contracts** (name registry + Zod payload per job) and the `enqueue` facade. Owns no execution semantics.                         |
| `@repo/auth`          | Better Auth server config (Drizzle adapter, plugins), server-side session helpers, typed client.                                       |
| `@repo/authz`         | Permission registry, roles, `can()` / `authorize()`, policy primitives. Pure and dependency-free by design.                            |
| `@repo/analytics`     | Typed product-event registry and server/client capture adapters (PostHog).                                                             |
| `@repo/flags`         | Feature-flag interface, typed flag registry, env + PostHog providers.                                                                  |

`@repo/authz` is deliberately pure (no DB, no session): it takes an actor and a resource and
returns a decision, which makes the entire authorization model unit-testable in milliseconds
and impossible to accidentally couple to a transport.

### Layer 2 — domain

| Package      | Responsibility                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `@repo/core` | **All business logic**, organised by feature. Ports for side effects, services, policies, repositories, domain events. |

### Layer 3 — transport

| Package      | Responsibility                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `@repo/trpc` | tRPC init, context type, base/protected/org procedures, error formatter, feature router composition. |

Kept out of `apps/web` so the router type can be imported by other clients (e.g. a future
mobile app or CLI) without importing a Next.js app.

### UI track (browser, parallel to layers 1–3)

| Package    | Responsibility                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@repo/ui` | The design system: shadcn/ui on Base UI, icon wrapper, motion primitives, Sonner. Theme tokens live in `tooling/tailwind` (`@repo/tailwind-config`). |

`@repo/ui` may import only Layer 0. It never learns that a database exists.

Heavy dependencies are isolated behind subpath exports so they cannot be pulled into the base
bundle by accident. Chart / editor / table are **deferred** until a product surface needs them;
the Next bundle-budget gate on `apps/web` keeps them off `/` when they land:

```
@repo/ui          → primitives (button, input, dialog, …)
@repo/ui/icons    → HugeIcons wrapper
@repo/ui/motion   → Motion wrappers
@repo/ui/sonner   → Toaster
@repo/ui/chart    → Recharts (deferred)
@repo/ui/editor   → Tiptap (deferred)
@repo/ui/table    → TanStack Table (deferred)
```

### Cross-cutting

| Package         | Responsibility                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `@repo/testing` | Vitest setup files, DB test harness (transaction-per-test), data factories, MSW handlers, Playwright fixtures. Dev-only. |

---

## 4. `tooling/` — shared configuration

```
tooling/
├── typescript/    tsconfig bases: base, library, next, node, test
├── oxlint/        Shared .oxlintrc.json + per-layer overrides
├── oxfmt/         Shared formatter config
├── tailwind/      Theme tokens + Tailwind 4 CSS-first preset
├── vitest/        Config factory (node / jsdom projects, coverage thresholds)
├── cspell/        Project dictionary
└── knip/          Shared Knip config
```

Separated from `packages/` because these are consumed by the _build_, never imported by shipped
code. Mixing them makes the dependency graph unreadable and confuses tools like Knip. This is
where the requested `packages/config` lives — as several focused config packages rather than
one grab-bag, so that changing the Tailwind theme cannot invalidate the TypeScript cache.

---

## 5. Feature module shapes

The repo has **two** kinds of feature module, and keeping them distinct is important.

### Server feature module — `packages/core/src/<feature>/`

```
packages/core/src/billing/
├── billing.service.ts       # Use cases. The only public entry point.
├── billing.policy.ts        # Authorization rules for this feature
├── billing.repository.ts    # Drizzle queries. The only file that touches @repo/db.
├── billing.errors.ts        # Feature-specific AppError subclasses
├── billing.events.ts        # Domain events emitted (→ jobs, analytics)
├── billing.mapper.ts        # Row → DTO (@repo/contracts) conversion
├── billing.service.test.ts  # Unit tests with in-memory ports
├── billing.repository.test.ts # Integration tests against real Postgres
└── index.ts                 # Public surface. Everything else is private.
```

Rules: services never import another feature's repository — cross-feature access goes through
the other feature's `index.ts`, or through a domain event when the coupling should be
asynchronous. A feature that needs three other features' internals is a sign the boundaries are
drawn wrong.

### Client feature module — `apps/web/src/features/<feature>/`

```
apps/web/src/features/billing/
├── components/          # Feature-specific React components
├── hooks/               # use-*.ts — TanStack Query wrappers over tRPC
├── stores/              # Zustand store, only for genuine client state
├── schemas/             # Form schemas (extend @repo/contracts, add UI-only fields)
└── index.ts
```

Rules: server state belongs to TanStack Query, URL state to nuqs, form state to React Hook
Form, and only what is left — ephemeral UI state shared across a subtree — goes into Zustand.
The most common state-management mistake is putting server data in a client store; the layering
here is designed to make that feel wrong.

---

## 6. `docker/`

```
docker/
├── web.Dockerfile
├── api.Dockerfile            # HTTP server + migrate entry (`node dist/migrate.mjs`)
├── worker.Dockerfile
├── docs.Dockerfile           # Fumadocs site (architecture, ADRs, runbooks, OpenAPI)
├── compose.yaml              # Local dev dependencies (postgres, redis, minio, mailpit, otel, jaeger, prometheus, grafana)
├── compose.prod.yaml         # Local prod-like: Traefik + migrate-then-roll + local tags
├── compose.test.yaml         # Ephemeral services for CI integration tests
├── compose.e2e.yaml          # Test deps + built web image for Playwright
├── otel-collector-config.yaml
├── prometheus/               # Scrape config + alert rules (local)
├── grafana/                  # Provisioning + RED / queue dashboards (local)
└── postgres/init/            # Extensions and roles at first boot
```

Dockerfiles live centrally, not per-app, so cross-cutting changes (base image bump, CVE patch,
build-cache strategy) are one review in one folder. See
[11](./11-infrastructure-and-deployment.md). CI publishes
`ghcr.io/<owner>/{web,api,worker,docs}:<sha>`. Migrate is the api image with a different command.

---

## 7. Optional adopter infrastructure (not in this repo)

This boilerplate does **not** ship an `infra/` tree. Hosts, DNS, TLS, object-storage buckets, and
secret stores are chosen per deployment. Illustrative patterns (OpenTofu modules, Ansible
playbooks, host Traefik, SOPS + age) live in [11](./11-infrastructure-and-deployment.md) as
examples only. The portable contract is: pull SHA-tagged images, run migrate to completion, roll
apps, smoke-test — documented in [docs/runbooks/deploy.md](../runbooks/deploy.md).

---

## 8. Workspace and task graph

`pnpm-workspace.yaml` uses a **dependency catalog** so shared versions are declared once — this
is what prevents two packages from silently resolving different Zod or React versions, the
classic monorepo failure:

```yaml
packages:
  - apps/*
  - packages/*
  - tooling/*

catalog:
  react: 19.2.8
  zod: 4.4.3
  typescript: 7.0.2
  # …
```

Packages then declare `"zod": "catalog:"`. Renovate updates the catalog in one place.

`turbo.json` defines the task graph. The principles:

- `build` depends on `^build` (topological).
- `typecheck`, `lint`, `test:unit` have **no** dependencies — they parallelise fully.
- `test:integration` and `test:e2e` depend on `^build` and require live services, so they are
  never part of the default local loop.
- `dev` is persistent, uncached.
- Inputs are declared precisely; env vars that affect output are listed in `env` so the cache
  cannot serve a stale artifact built with different configuration. Getting this wrong is the
  most common cause of "works in CI, broken in prod" with remote caching.

---

## 9. `Makefile` — the single entry point

pnpm scripts are for the task graph; the Makefile is for humans, because real workflows span
pnpm _and_ Docker.

```
make setup            # Install toolchain, deps, .env, start services, migrate, seed
make dev              # Services + all apps in watch mode
make check            # Everything CI runs, locally, in the same order
make images           # Build web/api/worker/docs images and assert size budgets
make e2e              # Playwright against the built web image
make e2e-host         # Fast Playwright against next start (local loops)
make load             # k6 via Docker grafana/k6 (needs Docker + prod-up)
make zap              # OWASP ZAP baseline (Docker) against Traefik
make restore-drill    # pg_dump → scratch DB → migrate → smoke
make db-reset         # Drop, migrate, seed
make email            # React Email preview server
make prod-up          # Local Traefik + migrate-then-roll + app images
make prod-down        # Tear down the local production-like stack
```

One command per intention, discoverable via `make help`. New engineers should need to read
exactly one file to be productive. Deploy to a real host follows
[docs/runbooks/deploy.md](../runbooks/deploy.md) — there is no `make deploy` that assumes a
specific fleet.
