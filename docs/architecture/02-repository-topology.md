# 02 — Repository topology

---

## 1. Top level

```
.
├── apps/                    # Deployable units. Thin. No business logic.
├── packages/                # Everything reusable. Where the code actually lives.
├── tooling/                 # Shared build/lint/test configuration, published to nobody.
├── docker/                  # Dockerfiles + compose stacks (deps, prod-like, test, e2e).
├── docs/                    # Architecture, ADRs, runbooks, security (this folder).
├── perf/                    # k6 load scenarios + ZAP baseline config (not PR CI).
├── scripts/                 # Repo automation (layers, restore-drill, budgets, …).
├── .github/                 # Workflows, templates, CODEOWNERS.

├── .cursor/rules/           # Glob-scoped rules — the per-file context AGENTS.md cannot give.
├── .agents/skills/          # Project skills. `.claude/skills` and `.cursor/skills`
│                            # symlink here; the content was triplicated byte-for-byte.
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
├── doctor.config.json       # React Doctor scan config.
├── renovate.json            # Dependency updates.
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
└── web/          Next.js 16 — the product. RSC UI, oRPC handler, auth handler, Stripe webhook.
```

One app, by decision rather than by accident — see
[ADR-0014](../adr/0014-single-transport-and-no-background-worker.md) for what the public REST app,
the worker, and the docs site cost an adopter, and what removing them gave up.

### `apps/web`

```
apps/web/
├── src/
│   ├── app/                        # ROUTING ONLY. No logic beyond composition.
│   │   ├── [locale]/
│   │   │   ├── (marketing)/        # Public, statically cached
│   │   │   ├── (auth)/             # sign-in, sign-up, reset, verify, passkey, 2FA
│   │   │   └── (app)/              # Authenticated product
│   │   │       └── [orgSlug]/      # Tenant-scoped surface (invoices, billing, settings)
│   │   ├── api/
│   │   │   ├── rpc/[[...rest]]/    # oRPC fetch adapter
│   │   │   ├── auth/[...all]/      # Better Auth handler
│   │   │   └── health/             # Liveness (`/api/health`)
│   │   ├── layout.tsx
│   │   └── global-error.tsx
│   ├── features/                   # Client-side feature modules (see §5)
│   ├── components/                 # App-specific composites; primitives live in @repo/ui
│   ├── server/
│   │   ├── context.ts              # Builds the request Ctx (actor, adapters, logger)
│   │   ├── container.ts            # Composition root: wires ports to adapters
│   │   └── router.ts               # Root oRPC router composition
│   ├── env/                        # Composition-root env modules (server / client / browser)
│   ├── i18n/                       # next-intl routing, request, navigation
│   ├── messages/                   # next-intl catalogs (`en.json`)
│   ├── orpc/                       # Browser client + TanStack Query helpers
│   ├── instrumentation.ts          # OTel process instrumentation
│   └── proxy.ts                    # Next 16 proxy (formerly middleware.ts)
├── e2e/                            # Playwright + axe specs (`make e2e`)
├── lighthouserc.cjs                # LHCI budgets (`make lighthouse`)
├── playwright.config.ts
├── next.config.ts
└── package.json
```

`app/` mirrors URLs and nothing else. The moment a route file exceeds composition — fetch data,
render, handle a form submission by delegating — the logic belongs in `features/` (client) or a
domain slice package (server).

> **Next 16 specifics that shape this layout:** `proxy.ts` replaces `middleware.ts` and runs on
> the Node runtime (so no Edge-compatibility constraints, but also no excuse to do
> authorization there); `cacheComponents: true` with explicit `use cache` replaces implicit
> caching, so caching becomes a deliberate per-boundary decision; `turbopack` config moved to
> top level; `revalidateTag(tag, profile)` / `updateTag(tag)` replace the old single-argument
> form.

### What `apps/web` composes

`src/server/container.ts` is the composition root: it builds the database handle, the logger, the
error tracker, Better Auth, the cache, and the port bundle, once per process behind a `globalThis`
singleton. `src/server/ports.ts` wires the concrete adapters into `CtxPorts`.

Two pieces exist because there is no longer a separate API app or worker to hold them:

- `src/app/api/webhooks/stripe/route.ts` — verifies the signature, claims a replay guard in Redis,
  and applies the event inline. With no queue, the HTTP response is Stripe's only signal, so a
  failure must surface as a non-2xx.
- `src/server/drain-outbox.ts` — drains pending outbox rows after a mutating request commits,
  dispatching through the handler registry in `src/server/outbox-handlers.ts`. Read the caveats in
  that file before relying on it: rows are only picked up when a _later_ request arrives.

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
| `@repo/contracts` | Zod schemas + inferred DTOs for everything crossing a wire. The shared vocabulary of client, oRPC, REST, and jobs. | Import `@repo/db` or any adapter                     |
| `@repo/i18n`      | Locale list, routing config, formatting helpers shared by web and email.                                           | Contain message catalogs (those live with their app) |

`@repo/contracts` is the keystone of the "one core, two transports" design: it is the only
package that both the browser and every server surface may import, so it is where request and
response shapes are defined once.

### Layer 1 — platform adapters (server-only)

| Package               | Responsibility                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@repo/logger`        | Pino instance factory, redaction, request-scoped child loggers via `AsyncLocalStorage`, trace-id correlation.                                        |
| `@repo/observability` | OTel SDK setup, span helpers, trace/log correlation.                                                                                                 |
| `@repo/db`            | Drizzle schema (one file per module), client factory, pool config, migrations, seeds, transaction helper, tenant-scoped query helpers.               |
| `@repo/cache`         | Redis client, namespaced keys, TTL policy, stampede protection, tag invalidation.                                                                    |
| `@repo/storage`       | S3 API client, presigned upload/download, key conventions. Sharp derivatives live on `@repo/storage/image` so the default graph never loads libvips. |
| `@repo/email`         | Resend adapter + React Email templates + a preview dev server; a `NoopMailer` for tests.                                                             |
| `@repo/payments`      | Stripe adapter: catalog sync, checkout/portal sessions, webhook handlers, entitlement mapping.                                                       |
| `@repo/auth`          | Better Auth server config (Drizzle adapter, plugins), server-side session helpers, typed client.                                                     |
| `@repo/authz`         | `can()` / `authorize()` and policy primitives, over the `@repo/permissions` registry. Pure and dependency-free by design.                            |
| `@repo/analytics`     | Typed product-event registry and server/client capture adapters (PostHog).                                                                           |
| `@repo/flags`         | Feature-flag interface, typed flag registry, env + PostHog providers.                                                                                |

`@repo/authz` is deliberately pure (no DB, no session): it takes an actor and a resource and
returns a decision, which makes the entire authorization model unit-testable in milliseconds
and impossible to accidentally couple to a transport.

The registry it reads lives one layer down in `@repo/permissions`, because `@repo/auth` needs the
same declaration and the two may not import each other. Keeping it in layer 0 is what lets session
RBAC and API-key RBAC be _derived_ from one `resource:action` list rather than hand-synchronised —
see [07 — auth](./07-auth.md#permissions).

### Layer 2 — kernel

| Package        | Responsibility                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `@repo/kernel` | Request context (`Ctx`), the side-effect ports, the audit-log writer, the transactional outbox, and the in-memory port doubles used in tests. |

### Layer 3 — domain slices

Each slice is its own package, so two slices cannot import each other
([ADR-0013](../adr/0013-kernel-and-slice-packages.md)).

| Package              | Responsibility                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `@repo/billing`      | **Business logic** for invoices: create, list, get, void, and the void policy.                |
| `@repo/subscription` | Stripe checkout and portal sessions, catalog sync, entitlements, subscription state.          |
| `@repo/assets`       | Presigned uploads, confirmation, and image derivatives. The only consumer of `@repo/storage`. |

### Layer 4 — transport

| Package      | Responsibility                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `@repo/orpc` | oRPC init, context type, public/protected/org procedures, AppError mapping, feature router composition. |

Kept out of `apps/web` so the router type can be imported by other clients (e.g. a future
mobile app or CLI) without importing a Next.js app.

### UI track (browser, parallel to layers 1–3)

| Package    | Responsibility                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `@repo/ui` | The design system: shadcn/ui on Base UI, icon wrapper, toast. Theme tokens live in `tooling/tailwind` (`@repo/tailwind-config`). |

`@repo/ui` may import only Layer 0. It never learns that a database exists.

Subpath exports keep icons and the toast host off the default barrel when a caller does not need them:

```
@repo/ui          → primitives (button, input, dialog, …)
@repo/ui/icons    → HugeIcons wrapper
@repo/ui/toast    → Toaster
```

### Testing (not a runtime package)

There is no `@repo/testing` package. Shared Vitest config lives in `tooling/vitest`
(`@repo/vitest-config`). Fakes, factories, and harnesses are **subpath exports** of the package
they belong to (`@repo/kernel/testing`, `@repo/db/testing`, `@repo/cache/testing`, …) so a layer-0
or layer-1 test helper cannot drag the whole domain graph into a unit test. Playwright fixtures
live next to `apps/web/e2e/`.

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

### Server slice package — `packages/<slice>/src/`

```
packages/billing/src/
├── index.ts                 # The only barrel. The package's public surface.
├── billing.service.ts       # Use cases
├── billing.policy.ts        # Authorization rules for this slice
├── billing.repository.ts    # Drizzle queries. The only file that touches @repo/db.
├── billing.errors.ts        # Slice-specific AppError subclasses
├── billing.events.ts        # Domain events emitted (→ outbox, analytics)
├── billing.mapper.ts        # Row → DTO (@repo/contracts) conversion
├── billing.service.test.ts  # Unit tests with in-memory ports
└── billing.repository.integration.test.ts
```

`src/index.ts` is the only barrel ([04](./04-conventions.md)). Cross-slice imports are not a matter
of discipline here: slices are layer-3 peers, so the layer rule and pnpm's isolated
`node_modules` both reject them. Reach another slice through a domain event, or move the shared
rule down into `@repo/kernel`. A slice that needs three others' internals is a sign the boundaries
are drawn wrong.

Use `make new-slice NAME=<thing>` rather than copying this by hand — it scaffolds the package and
registers it in every closed registry.

### Client feature module — `apps/web/src/features/<feature>/`

```
apps/web/src/features/billing/
├── *.tsx                # Feature-specific React components (pages import these files)
├── hooks.ts             # TanStack Query wrappers over oRPC
├── schemas/             # Form schemas (extend @repo/contracts, add UI-only fields)
└── stores/              # Optional Zustand store — only for genuine client state
```

No feature-level `index.ts`. Same barrel rule as packages: import the file, not a folder.

Rules: server state belongs to TanStack Query, URL state to nuqs, form state to React Hook
Form, and only what is left — ephemeral UI state shared across a subtree — may go into Zustand
(add the catalog pin when a feature needs it; none do today). The most common state-management
mistake is putting server data in a client store; the layering here is designed to make that
feel wrong.

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
make dev              # Services + all apps (Portless: https://web.localhost)
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
