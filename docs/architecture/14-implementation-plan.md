# 14 — Implementation plan

The architecture is built in **phases, each shipped as its own reviewable pull request**, and each one
leaving the repository in a working state with CI green. No phase depends on a later phase to be
coherent.

Two rules govern the order:

1. **Verification infrastructure comes before the things it verifies.** The toolchain and CI exist
   before any application code, so nothing is ever written unverified and retrofitted.
2. **Every phase ends with something demonstrable.** Not "the auth package exists" but "you can sign
   up, and a test proves it".

---

## Phase overview

| #   | Phase                    | Delivers                                                          | Depends on |
| --- | ------------------------ | ----------------------------------------------------------------- | ---------- |
| 0   | Decisions                | Open questions answered, ADRs moved to Accepted                   | —          |
| 1   | Skeleton & toolchain     | Monorepo, TypeScript 7, Oxlint, Oxfmt, hooks, `make check`        | 0          |
| 2   | Foundation packages      | `types`, `utils`, `env`, `errors`, `contracts`, `i18n`, `testing` | 1          |
| 3   | Data layer               | `db` with schema, migrations, seeds, real-Postgres test harness   | 2          |
| 4   | Platform adapters        | `logger`, `cache`, `storage`, `email`, `jobs`, `observability`    | 3          |
| 5   | Auth & authorization     | `auth`, `authz`, sign-up/in flows, organizations                  | 4          |
| 6   | Domain core & tRPC       | `core`, `trpc`, the vertical slice                                | 5          |
| 7   | Design system            | `ui` with Tailwind theme, shadcn/ui on Base UI, a11y tests        | 2          |
| 8   | Web application          | `apps/web`: routing, i18n, theming, the slice's UI, E2E           | 6, 7       |
| 9   | Public API               | `apps/api`: REST `/v1`, OpenAPI, Scalar, API keys, rate limits    | 6          |
| 10  | Workers                  | `apps/worker`: BullMQ consumers, schedules, outbox relay          | 4, 6       |
| 11  | Containers & local stack | Dockerfiles, compose stacks, `make` targets                       | 8, 9, 10   |
| 12  | CI/CD                    | Full pipelines, image publishing, Changesets, Renovate            | 11         |
| 13  | Infrastructure           | OpenTofu, Ansible, Traefik, SOPS, first real deploy               | 12         |
| 14  | Observability wiring     | OTel end-to-end, Sentry, PostHog, flags, dashboards, alerts       | 13         |
| 15  | Documentation site       | `apps/docs` with Fumadocs, ADRs, embedded API reference           | 9          |
| 16  | Hardening                | Load tests, a11y audit, security review, runbooks, DR drill       | 14         |
| 17  | Optional modules         | Payments, Trigger.dev, advanced UI widgets                        | 16         |

Phases 7 and 9 can run in parallel with their neighbours once their dependencies land.

---

## Phase 0 — Decisions

Not code, but a real phase: five choices change the shape of what gets built.

Answer **Q1–Q5** in the [index](./README.md#7-open-questions-requiring-your-decision), then move
ADRs [0006](../adr/0006-organization-scoped-multi-tenancy.md),
[0007](../adr/0007-split-background-work-bullmq-triggerdev.md), and
[0008](../adr/0008-drizzle-version-selection.md) from Proposed to Accepted (or rewrite them to match
the decisions taken).

**Done when** every ADR is Accepted and no open question remains.

---

## Phase 1 — Skeleton & toolchain

Root `package.json` with scripts only and no runtime dependencies; `pnpm-workspace.yaml` with globs
and the version catalog; `.npmrc` with `node-linker=isolated` (this is architecture, per
[ADR-0002](../adr/0002-layered-monorepo-with-pnpm-enforcement.md)); `turbo.json` with the task graph
and precise `inputs`/`env` declarations; `tooling/typescript`, `tooling/oxlint`, `tooling/oxfmt`,
`tooling/cspell`, `tooling/knip`; Lefthook hooks; commitlint; `.editorconfig`, `.gitattributes`,
`.gitignore`; the `Makefile` with `help`, `setup`, `check`; a minimal CI workflow; `.cursor/rules/` and
`AGENTS.md` encoding the layer boundaries; and the layer-assertion script.

**Done when** `make check` passes on an empty repository, hooks fire, and adding a deliberately
illegal cross-layer dependency fails CI. Test the enforcement now, while it is cheap to fix.

## Phase 2 — Foundation packages

Layer 0, in dependency order: `types` (branded ids, utility types), `utils` (`invariant`,
`assertNever`, id generation, cursor encoding), `errors` (the `AppError` hierarchy and the error-code
registry), `env` (server/client/shared schemas with composable presets), `contracts` (pagination,
common shapes), `i18n` (locales and routing config). Then `testing` with the Vitest config factory and
the first fakes.

**Done when** each package has tests, `@repo/errors` has 100 % coverage, and a test proves that
importing `@repo/env/server` from a client-marked file fails.

## Phase 3 — Data layer

`@repo/db`: client factory with pool configuration and timeouts; the schema for `organization`,
`member`, `user`, `invitation`, `audit_log`, `outbox`, and `asset`; `withTransaction`; tenant-scoped
query helpers and the `TenantCtx` type; the first migration; the three seed tiers; and the integration
test harness (template database, transaction-per-test, factories).

**Done when** migrations apply to a clean database, seeds run, `make db-reset` works, and a
cross-tenant isolation test passes for one repository function — establishing the pattern every later
function follows.

## Phase 4 — Platform adapters

`logger` (Pino, redaction, `AsyncLocalStorage`, trace-id mixin), `cache` (namespaced keys, TTL,
stampede protection), `storage` (S3 client, presign, key conventions), `email` (Resend adapter, the
first React Email template, `NoopMailer`, preview server), `jobs` (name registry, payload schemas,
`JobQueue` port and BullMQ adapter), `observability` (OTel SDK, Sentry init).

**Done when** each adapter has an integration test against its real local service (MinIO, Redis,
Mailpit) and a fake for unit tests.

## Phase 5 — Auth & authorization

`@repo/authz` first, because it is pure and everything else depends on its shape: permission registry,
roles composed from `adminAc`/`memberAc`, `can()`/`authorize()`, and an exhaustive role × action test
matrix. Then `@repo/auth`: Better Auth with the Drizzle adapter, database sessions plus cookie cache,
email/password with verification, OAuth, the organization plugin, API keys, and the `Actor` resolver.

**Done when** the policy matrix is complete, sign-up/sign-in/verify work end to end, an organization
can be created and a member invited, and a test proves an API key and a session produce identical
`Actor` shapes.

## Phase 6 — Domain core & the vertical slice

`@repo/core`: the `Ctx` type, the `ports/` definitions, the event bus, the outbox writer, and
`shared/`. Then **the vertical slice** — one complete feature (per Q5, recommended option (b)) with
service, policy, repository, errors, events, mapper, and both test levels. Then `@repo/trpc` with the
layered procedures, the error formatter, and the slice's router.

This phase produces the **reference implementation every future feature is copied from**, so it gets
disproportionate review attention. Its file layout, naming, test structure, and error handling become
the de facto standard whether or not anyone intends that.

**Done when** the slice is callable over tRPC with authorization enforced, a domain event enqueues a
job, and unit tests run with no database.

## Phase 7 — Design system

`@repo/ui`: Tailwind 4 CSS-first theme in `tooling/tailwind` with tokens as CSS variables; `cn()`;
shadcn/ui initialised on Base UI (`@base-ui/react` 1.6.0 — note the package rename); the core
primitives; the HugeIcons wrapper; Motion primitives; Sonner. Chart / editor / table subpaths are
deferred until product needs them. Plus a minimal `apps/web` with a `/design-system` gallery (full
product web surface is Phase 8).

**Done when** every component has behaviour and axe tests, a test proves `@repo/ui` has no `node:*` in
its transitive graph, and the bundle-budget check is in place so a heavy dependency cannot leak into
the base bundle unnoticed.

## Phase 8 — Web application

`apps/web`: route groups, `[locale]` routing with next-intl, `proxy.ts` (locale and cookie presence
only — no authorization), theming, the auth screens, the app shell with the organization switcher, the
slice's UI with TanStack Query over tRPC, nuqs for filters, Server Actions for forms, error and
loading boundaries, and the container/context composition roots. Then the E2E suite.

**Done when** the critical journeys pass in Playwright, Lighthouse and axe are clean on the main
pages, and `cacheComponents` boundaries are explicit and commented.

## Phase 9 — Public API

`apps/api`: Hono bootstrap, middleware (request id, OTel, API-key auth, rate limit, error mapper),
`/v1` routes for the slice, generated and committed `openapi.json` with the CI diff check, Scalar
mount, idempotency handling, cursor pagination, and the Stripe webhook endpoint skeleton.

**Done when** the same operation is reachable over tRPC and REST with **identical authorization
behaviour**, proven by a test — this is the assertion that validates
[ADR-0003](../adr/0003-one-domain-core-two-transports.md).

## Phase 10 — Workers

`apps/worker`: bootstrap with graceful shutdown and a health port, the email and image-derivative
consumers, the outbox relay, repeatable schedules with locking, dead-letter queues with alerts, and a
startup assertion that Redis is configured `noeviction`.

**Done when** an upload produces derivatives end to end, a job retried twice is proven idempotent, and
SIGTERM drains cleanly.

## Phase 11 — Containers & local stack

The four Dockerfiles with `turbo prune`, multi-stage builds, non-root users, and healthchecks;
`compose.yaml`, `compose.prod.yaml`, `compose.test.yaml`; and the full `Makefile`.

**Done when** all images build under 250 MB (web) / 150 MB (api, worker), `make setup` works on a clean
machine, and the E2E suite passes against the built images rather than the dev servers.

## Phase 12 — CI/CD

Full CI with parallel jobs and `--affected`; remote caching with the `env` declarations audited
(getting this wrong is the one way remote caching causes a production bug); Trivy, CodeQL, Gitleaks;
multi-arch image publishing to GHCR with SBOM and provenance; Changesets release workflow; Renovate;
issue and PR templates; `CODEOWNERS`.

**Done when** a PR completes in under 6 minutes, images publish on merge, and a test release produces
a correct changelog.

## Phase 13 — Infrastructure

OpenTofu modules and both environments; Ansible provisioning and deployment playbooks; Traefik static,
dynamic, and middleware configuration; SOPS + age with the key set and rotation runbook; the migration
job; and the first real deploy to staging followed by production.

**Done when** staging and production are serving, TLS is valid, deployment and rollback have both been
performed deliberately, and the connection-budget arithmetic is recorded in the runbook.

## Phase 14 — Observability wiring

OTel traces spanning web → api → worker (including across queue boundaries), Sentry with releases and
source maps, PostHog with the typed event registry and the reverse proxy, `@repo/flags` with both
providers and expiry enforcement, dashboards, and alerts with runbook links.

**Done when** every question in [08 §5](./08-observability.md#5-what-good-observability-means-here)
can be answered in minutes, verified by walking through them.

## Phase 15 — Documentation site

`apps/docs` with Fumadocs, rendering the architecture documents and ADRs, embedding the Scalar
reference, plus getting-started and contribution guides. The root `README.md` is written last, when
there is something true to describe.

## Phase 16 — Hardening

k6 scenarios with asserted thresholds, and the **saturation point identified and documented** — the
most valuable output, because it determines the scaling runbook. Full manual accessibility audit with
a keyboard and a screen reader. Security review (authorization matrix, tenant isolation, secret
handling, headers, ZAP baseline). All runbooks written. A **restore drill actually performed**, not
described.

## Phase 17 — Optional modules

Per Q2 and Q5: `@repo/payments` with Stripe (catalog sync, checkout, portal, webhooks, entitlements),
`apps/tasks` with Trigger.dev, and the advanced UI widgets if the product needs them.

---

## Working agreement during implementation

- **One phase, one PR** where size permits; larger phases split by package, each keeping CI green.
- **Every PR includes its tests and its documentation.** Not a later cleanup pass — the tests and docs
  are how the PR is reviewed.
- **A phase is not done until `make check` passes and its "Done when" criterion is demonstrated.**
- **Deviations from this document produce an ADR**, and the architecture document is updated in the
  same PR.
- **No `TODO` without an issue reference.** Unreferenced TODOs are permanent.
- **After Phase 6, re-test the five acceptance operations** in
  [01 §5](./01-principles-and-constraints.md#5-the-test-of-this-architecture). If adding a feature is
  not yet cheap, the boundaries are wrong, and Phase 6 is the last moment when fixing them is
  inexpensive.
