# 13 — Dependency review

Every dependency is a permanent liability: supply-chain surface, upgrade work, and a ceiling on
what can change later. This document justifies each one and records how we would leave it.

**The bar:** does it solve a genuinely hard problem, is it likely to outlive our project, and is
replacing it tractable? If we could replace it with under ~150 lines of our own code, we write the
lines.

Each entry carries:

- **Why** — what it does that we will not do ourselves.
- **Instead of** — the alternatives considered and why they lost.
- **Health** — maintenance, adoption, ecosystem maturity, as of 2026-09-06.
- **Exit** — migration difficulty if we must leave. **Low** = days, contained. **Medium** = weeks,
  touches many files mechanically. **High** = months or a rewrite.

---

## 1. Foundation

### Node.js 24 LTS

**Why** The only runtime with a mature ecosystem for everything else here. Native TypeScript
stripping, stable `fetch`, `AsyncLocalStorage`, and a permission model.
**Instead of** _Bun_ — genuinely faster, but Node compatibility gaps still surface in Sharp, Playwright,
and native database drivers, and a foundation cannot absorb "works everywhere except our runtime".
_Deno_ — excellent design, smallest npm-adjacent ecosystem of the three.
**Health** Long-term OpenJS governance. The safest possible choice.
**Exit** High for the runtime itself, but nothing in our code is Node-specific beyond adapters.

### pnpm 12

**Why** Isolated `node_modules` is load-bearing architecture, not a preference: it makes undeclared
imports physically unresolvable, which is how our layer boundaries are enforced
([03](./03-package-graph-and-boundaries.md#31-pnpm-isolated-node_modules--physical-enforcement)).
Plus catalogs for single-source version pinning, a content-addressed store, and a native Rust CLI
that keeps the pnpm 11 command surface and lockfile format.
**Instead of** _npm_ — hoists by default, so boundaries are unenforceable and phantom dependencies are
invisible until they break. _Yarn_ — Plug'n'Play is powerful but breaks tools that expect real
files; Yarn 1 is unmaintained. _Bun install_ — fast, less mature workspace semantics. _Staying on
pnpm 11_ — compatible, but the 11 line is now maintenance while 12 is the rewrite the project is
standardizing on.
**Health** The de facto standard for monorepos; used by Vue, Vite, Prisma, Next.js itself. 12.x is
stable (2026-08-26); `latest` on npm still points at 11, so the pin is an exact `packageManager`
version rather than a dist-tag.
**Exit** Low mechanically, but the boundary guarantee is lost — so this is a deliberately sticky choice.

### Turborepo 2.10

**Why** Content-hash task graph with local and remote caching, `--affected` filtering, and
`turbo prune` for minimal Docker contexts. Near-zero configuration.
**Instead of** _Nx_ — more capable (generators, module-boundary lint rules) and correspondingly more
opinionated; its plugin/executor model is real lock-in, and its boundary enforcement is an ESLint
rule, which is both bypassable and now blocked behind typescript-eslint's TypeScript 7 stance.
_Bazel_ — correct at Google's scale, disproportionate here. _pnpm workspaces alone_ — no task graph,
no caching; fine until the repo has fifteen packages.
**Health** Vercel-maintained, ubiquitous, stable 2.x line.
**Exit** Low. It orchestrates scripts; removing it means running scripts more slowly.

### TypeScript 7.0

**Why** Native Go port, GA 2026-07-08, ~8–12× faster full builds, with type-checking logic ported
rather than rewritten (so semantics are compatible). The speed is what makes the sub-5-second
whole-repo typecheck target reachable.
**Instead of** Staying on TypeScript 6 — viable and would keep the ESLint ecosystem working, but it
means deliberately choosing a compiler that is an order of magnitude slower and now on a maintenance
track.
**Health** Microsoft, more than a year of dedicated work, validated against a decade of test suites
and multi-million-line codebases (VS Code, Bluesky, Linear, Vercel).
**Exit** Not applicable — but see the risk register: TypeScript 7.0 ships **without a stable
programmatic API** until 7.1 (~Q4 2026), and that has ecosystem consequences we plan around
explicitly.

### `@typescript/typescript6` (escape hatch, not installed)

**Why** Ships a `tsc6` binary re-exporting the TypeScript 6 API. Add it if a tool we adopt still
needs the old programmatic API. No current workspace package depends on it.
**Instead of** Pinning the whole repo to TypeScript 6.
**Health** Maintained by the TypeScript team explicitly as a transition bridge.
**Exit** Remove the pin once every tool we use targets the 7.1 API.

---

## 2. Application framework

### Next.js 16

**Why** React Server Components, streaming, the App Router, image optimisation, and a first-class
Node server output (`standalone`) that self-hosts cleanly in Docker. Version 16 specifically gives us
`proxy.ts` on the **Node** runtime — which removes an entire class of Edge-compatibility bugs — and
Cache Components, which make caching an explicit per-boundary decision instead of an implicit
default that surprises people.
**Instead of** _Remix / React Router 7_ — excellent web-fundamentals model, smaller ecosystem, no RSC
story of comparable maturity. _TanStack Start_ — very promising and philosophically closer to our
preference for explicitness, but younger than we can bet a multi-year foundation on. _Vite + React
SPA + separate API_ — simpler and a legitimate choice, but forfeits SSR, streaming, and SEO, which we
want for the marketing and app surfaces. _Astro_ — better for content-first sites than for an
application.
**Health** Vercel-maintained, the largest React meta-framework ecosystem. The obvious criticism —
Vercel-alignment — is mitigated by our rule that nothing imports `@vercel/*`, so self-hosting stays
a first-class path.
**Exit** High. This is the most coupled dependency in the repo, which is exactly why business logic
lives in slice packages and Next is confined to `apps/web`. A migration would rewrite one app, not the
system.

### React 19.2

**Why** Server Components, Actions, `useOptimistic`, `useFormStatus`, and the compiler.
**Instead of** _Vue / Svelte / Solid_ — all technically fine; React wins on ecosystem depth, hiring, and
the fact that every other choice in this stack (shadcn/ui, Base UI, TanStack Query) targets it
first.
**Health** Meta + a large independent contributor base.
**Exit** High, by definition.

---

## 3. UI

### Tailwind CSS 4.3

**Why** Utility-first styling that keeps style co-located with markup and produces bounded CSS
regardless of app size. Version 4's CSS-first configuration means design tokens are CSS variables,
so theming is a variable swap. The Oxide engine removed the build-performance objection.
**Instead of** _CSS Modules_ — no design-system constraints, and naming every element is tedium.
_styled-components / Emotion_ — runtime cost and poor RSC compatibility. _Panda CSS / vanilla-extract_
— excellent type safety, far smaller ecosystems. _Plain CSS_ — unbounded growth in a large app.
**Health** Enormous adoption; the default assumption of nearly every component library.
**Exit** Medium-High — utility classes are spread through every component, though the migration is
mechanical and tokens are already centralised.

### shadcn/ui (CLI) + `@base-ui/react`

**Why** shadcn/ui is not a dependency in the usual sense: it copies component source into our repo,
so we own and can modify it, with no version to upgrade and no wrapper API to fight. Base UI supplies
the hard parts underneath — focus management, keyboard interaction, ARIA, portalling, positioning.
**Note on the current state:** as of **July 2026, Base UI is shadcn/ui's default** primitive base
(Radix remains fully supported via `shadcn init -b radix`, and is not deprecated). Base UI is at
**1.7.0** with 6M+ weekly downloads. The package was **renamed**: the maintained package is
`@base-ui/react`, not the older `@base-ui-components/react` (which stopped at `1.0.0-rc.0`). We
initialise on Base UI, so our components sit on the path upstream actively develops, and a
first-party migration skill exists in the other direction if we ever need it.
**Instead of** _Radix UI_ — mature, battle-tested, and the safe conservative pick; we choose Base UI
because it is where shadcn/ui's new work lands, and because it is built by the same core team with
the benefit of Radix's lessons. _MUI / Mantine / Chakra_ — prescriptive design and heavy runtime
theming; customisation means fighting the library. _Headless UI_ — narrower component set.
**Health** Base UI: 1.7.0 stable, regular releases, MUI-team provenance. shadcn/ui: the dominant
pattern for React design systems.
**Exit** Low for shadcn/ui (the code is ours). Medium for Base UI, and the existence of an official
Radix↔Base migration skill bounds it further.

### ReUI registry (`@reui`)

**Why** A shadcn-compatible registry, so `shadcn add @reui/<name>` copies source in exactly as the
default registry does. It ships a `base-nova` (Base UI) variant alongside `radix-nova`, so it needs
no primitive swap here. Registered in both `components.json` files; nothing is installed by default.

**What it is good for, measured.** Simple components land clean: `@reui/badge` produced **0 type
errors and 0 lint errors**. The flagship complex components do not: `@reui/data-grid` vendors
~10,200 lines and produced **33 type errors and 121 lint errors** against this repo's settings —
mostly `exactOptionalPropertyTypes`, `noUnusedLocals`, 18 non-null assertions, and 23 unsafe type
assertions. The last two are AGENTS.md §4 non-negotiables. Fixing them by hand means a
diff no one can meaningfully review, which upstream re-breaks on every update, and exempting `reui/**` from the gates
would put third-party code permanently outside the checks. **So: pull the simple components, and
hand-write or find another answer for data-grid and kanban.**

**Install recipe.** `shadcn add` needs two corrections afterwards, both of which `make check`
catches:

1. It writes caret ranges into `packages/ui/package.json`. Move each new dependency into the
   `pnpm-workspace.yaml` catalog at an exact version and set the manifest entry to `catalog:` (§6).
2. It emits `import { cn } from "cn"` and adds an npm `cn` package. This repo already has `cn` in
   `packages/ui/src/lib/cn.ts` — rewrite the import to `@repo/ui/lib/utils` and drop the package.

Overwrite prompts for existing components are safe to accept: our 18 components are upstream
`base-nova` verbatim apart from formatting and that `cn` import.

**Instead of** _Writing every complex component by hand_ — slower, but it is what we do for the two
that do not fit. _Switching the whole design system to ReUI_ — it is a registry, not a framework;
there is nothing to switch to.
**Health** Active registry (Keenthemes); free tier covers components and examples.
**Exit** None to speak of — nothing is installed by default, and anything pulled becomes our source.

### `@hugeicons/react`

**Why** Large, consistent, multi-style icon set with a tree-shakeable React package.
**Instead of** _Lucide_ — the usual default; smaller and excellent, and the honest fallback if
HugeIcons' licensing or maintenance ever disappoints. _Heroicons_ — small set. _react-icons_ —
aggregates many sets with inconsistent metrics and poor tree-shaking.
**Health** Actively developed commercial project with a free tier.
**Exit** Low — icons are used through a single `@repo/ui/icons` wrapper, so swapping the set is one
file plus a name mapping. That wrapper exists specifically because this is the dependency most
likely to be replaced for non-technical reasons.

### React Hook Form 7.83 + Zod resolver

**Why** Uncontrolled-input architecture means typing in a field does not re-render the form, which is
the difference between a snappy and a sluggish large form. Mature validation resolvers.
**Instead of** _TanStack Form_ — promising, better types, much younger. _Formik_ — effectively
stagnant and re-renders on every keystroke. _Native form state + Server Actions_ — used for simple
progressive-enhancement forms; insufficient for complex client-side validation UX.
**Health** Very widely adopted, stable API for years.
**Exit** Low-Medium — per-form, mechanical.

### Zod 4.4

**Why** The type vocabulary of the entire repo. One schema simultaneously gives runtime validation,
a static type, an OpenAPI schema, and a form resolver. Version 4 is substantially faster with a
smaller footprint than v3.
**Instead of** _Valibot_ — smaller bundles via modularity and a real contender; Zod wins on ecosystem
integration (oRPC, `@hono/zod-openapi`, RHF all target it first), which for us outweighs
kilobytes. _ArkType_ — impressive performance, younger. _Yup_ — weaker inference. _TypeBox_ —
JSON-Schema-first, less ergonomic. _io-ts_ — functional style we do not want repo-wide.
**Health** The standard for TypeScript validation.
**Exit** High — it is woven through contracts, env, forms, API, and jobs. This is an accepted,
deliberate concentration: the alternative is a weaker abstraction in the place we most rely on.

### TanStack Query 5.102

**Why** Server-state caching, deduplication, background refetching, pagination, and optimistic updates
— roughly 3,000 lines of subtle logic we would otherwise write badly.
**Instead of** _SWR_ — lighter, less capable on mutations and invalidation. _RTK Query_ — requires
Redux. _Apollo_ — GraphQL-oriented. _Hand-rolled `useEffect` fetching_ — the reason this library
exists.
**Health** Framework-agnostic core, huge adoption, exemplary maintenance.
**Exit** Medium — hooks are wrapped per feature, so the surface is contained.

### Zustand (permitted, not currently a dependency)

**Why** Minimal client state with no provider, no boilerplate, and a hook-based selector API.
**Scope:** genuine client state only — server data belongs to TanStack Query, URL state to nuqs,
form state to RHF. The product currently has no Zustand store; add the catalog pin when a
feature actually needs one.
**Instead of** _Redux Toolkit_ — far more ceremony than our scope needs. _Jotai / Valtio_ — fine
alternatives with different mental models. _Context + `useReducer`_ — no selector granularity, so
re-render storms.
**Health** Small, stable, widely used.
**Exit** Low — few stores, small surface.

### next-themes 0.4

**Why** Solves one small, genuinely annoying problem correctly: theme switching with no flash of
incorrect theme, respecting `prefers-color-scheme`, synchronised across tabs, and SSR-safe.
**Instead of** Hand-rolling it — about 60 lines, but the blocking-script-before-paint detail is
exactly the sort of thing done subtly wrong.
**Health** Tiny, stable, essentially finished.
**Exit** Low.

### next-intl 4.13

**Why** i18n designed for the App Router: server-first message loading (so translations do not bloat
the client bundle), typed message keys, ICU message format, locale-segment routing, and
locale-correct formatting.
**Instead of** _react-i18next_ — the incumbent, but client-oriented with awkward RSC integration.
_Lingui_ — compile-time extraction is appealing, smaller ecosystem. _Paraglide_ — interesting
compiler-based approach, younger. _Rolling our own_ — plurals, gendered forms, and locale-aware
formatting are deceptively hard.
**Health** Actively maintained in step with Next.js releases.
**Exit** Medium — message keys are spread through components, but the catalog format is portable.

### shadcn/ui Toast (Base UI)

**Why** Toast notifications with stacking, swipe dismissal, promise states, status types, and
accessibility, assembled on `@base-ui/react/toast` — the primitive layer this design system already
uses. shadcn/ui retired the Sonner recipe on the Base UI track and ships this component instead.
**Instead of** _Sonner_ — still the Radix-track shadcn default, but a second client stack here once
Base UI already provides the primitive. _react-hot-toast_ — comparable, extra dependency.
_Hand-rolled_ — animation and a11y details make this bigger than it looks.
**Health** Lives in `@base-ui/react`, which we already take as the primitive layer.
**Exit** Low — one wrapper in `@repo/ui`.

### Date arithmetic

**Why** Formatting goes through `Intl` via `@repo/i18n` so it is locale-correct without shipping
locale data. Arithmetic today is native `Date` (and Postgres `timestamptz`). If calendar arithmetic
grows beyond that, **date-fns** is the nominated library (immutable, tree-shakeable, time-zone
support in v4) — add it to the catalog when a call site needs it. **Temporal** is the eventual
right answer once runtime support is universal.
**Instead of** _Day.js_ / _Luxon_ / _Moment_ — plugin-based, larger, or deprecated.
**Health** Native `Intl` and `Date` are the platform. date-fns remains widely used if we adopt it.
**Exit** Low.

### nuqs 2.9

**Why** Type-safe URL search-param state with Zod-compatible parsers, shallow routing, and history
control. URL-as-state makes filters and tabs shareable and back-button-correct, and doing it by hand
against the App Router router is fiddly and easy to get wrong.
**Instead of** `useSearchParams` directly — no types, no serialisation, manual history management.
_Storing filter state in Zustand_ — breaks sharing and back-button behaviour, which is the actual
requirement.
**Health** Small, focused, actively maintained alongside Next.js releases.
**Exit** Low.

---

## 4. Backend

### oRPC 2

**Why** Compile-time end-to-end types between our own client and server with no codegen and no
schema-drift window. Middleware composition gives us the layered `public`/`protected`/`org`
procedures that make authorization structural. First-party TanStack Query helpers and a built-in
serializer (no SuperJSON). CSRF for cookie-authenticated RPC is POST-only handling plus
`SameSite=Lax` session cookies — v2 deleted the v1 custom-header plugin pair. See
[ADR-0011](../adr/0011-orpc-private-api.md) and [ADR-0012](../adr/0012-orpc-2-private-api.md).
**Instead of** _tRPC 11_ — the previous private transport; same job, larger client, SuperJSON, and
a React provider we no longer want. _oRPC 1.15_ — still what `latest` points at; staying would
defer a wire-incompatible upgrade that does not get cheaper. _REST for internal calls too_ —
loses type safety or requires codegen. _GraphQL_ — a schema, resolvers, N+1 concerns, and a
client cache for a problem we do not have. _Unifying public REST onto oRPC OpenAPI_ — would
collapse the two-audience split ADR-0003 exists to protect. _Server Actions only_ — insufficient
for queries, caching, and non-form interactions. _TS-Rest_ — similar idea, smaller RPC/client
story.
**Health** 2.x is on the `beta` dist-tag (`2.0.0-beta.33`); `latest` remains 1.15. Smaller
ecosystem than tRPC. Pin exact, upgrade server and client together, do not automerge.
**Exit** Medium — resolvers are thin over the slice services, so replacing the transport is a
transport-layer job. This is precisely what the one-core-two-transports design protects. Leaving
beta for 2.0.0 `latest` is a catalog bump.

### tsdown 0.22

**Why** Bundles the one-shot migrate CLI (`packages/db/src/migrate.ts`) into a single ESM artifact
for `docker/migrate.Dockerfile`, so source-only workspace packages resolve at build time and the
runtime image ships `dist/migrate.mjs` plus the SQL rather than `node_modules` for the whole
monorepo. Rolldown-based, TypeScript-native, and small enough that the config lives next to the
package.
**Instead of** _tsup_ — esbuild-based and effectively in maintenance; _esbuild_ directly — more
boilerplate for the same job; _shipping source + node_modules_ — large images and workspace symlink
pain; _pnpm deploy_ alone — workable but still ships far more than one JS file.
**Health** Active under the Rolldown org; pin exactly.
**Exit** Low — replace the `build` script and Docker `CMD`; the migrate script itself is unchanged.

### Hono + `@hono/zod-openapi` (removed)

**Why it was here:** a small, fast, Web-standard framework for the public REST API, where
`@hono/zod-openapi` derived the OpenAPI 3.1 document **from the same Zod schemas that validated
requests** — so the spec could not drift from the implementation.

**Decision:** removed with `apps/api`
([ADR-0014](../adr/0014-single-transport-and-no-background-worker.md)). The reasoning above is why
it would still be the right pick for a public REST surface, and it is worth re-reading before
choosing something else.

**Revisit if:** third parties need API access. Note that oRPC's OpenAPI support is not a
substitute for the property that mattered here — it generates from a different router, so the
"one source of truth for validation and spec" guarantee has to be re-established rather than
inherited.

### Better Auth 1.6

**Why** Detailed in [07](./07-auth.md#why-better-auth): our tables in our database, self-hostable,
TypeScript-native, first-class Drizzle adapter, and maintained plugins for organizations/RBAC, API
keys, passkeys, and 2FA. Auth is the canonical "genuinely hard problem" the dependency bar exists
for.
**Instead of** _Auth.js/NextAuth_ — treats your database as a foreign store; multi-tenancy, API keys,
and RBAC are left to you. _Clerk / WorkOS / Auth0 / Kinde_ — better products in isolation, but they
hold the identity graph, price per user, and cannot be self-hosted. _Supabase Auth_ — good, arrives
attached to Supabase. _Lucia_ — deprecated by its author into a learning resource. _Hand-rolled_ —
sessions are easy; enumeration resistance, OAuth edge cases, passkey ceremonies, and 2FA recovery are
not.
**Health** Rapid, high-quality development; now a default choice in the TypeScript ecosystem. The
release cadence is fast enough that we pin exactly and read changelogs.
**Exit** Medium — the schema is plain, readable SQL and password hashes are portable, which is
exactly the property a hosted IdP denies you.

### PostgreSQL 18

**Why** See [06](./06-data-and-storage.md#why-postgresql-and-nothing-else). Relational storage,
`jsonb`, full-text search, `SKIP LOCKED`, `pgvector` if needed, native `uuidv7()`, and universal
managed support.
**Instead of** _MySQL/MariaDB_ — weaker JSON, weaker full-text, no comparable extension ecosystem.
_SQLite/Turso_ — wonderful for single-node and edge; concurrent-write limits rule it out here.
_MongoDB_ — we have relational data with real invariants. _CockroachDB / Yugabyte_ — distributed SQL
we do not need, with the operational cost we would inherit.
**Exit** High — but it is the choice least likely to need one.

### Drizzle ORM 0.45 + drizzle-kit

**Why** SQL-shaped TypeScript: queries look like the SQL they generate, so there is no hidden query
behaviour to discover in production. No code-generation step (types come from the schema definition),
no separate schema DSL, and a genuinely small runtime — which also makes it usable in bundled worker
images.
**Instead of** _Prisma_ — better DX for simple CRUD, but a Rust query engine binary, a separate schema
language, historically weak transaction and raw-SQL ergonomics, and generated-client friction in a
monorepo. Prisma's recent direction improves this, and it remains the main alternative.
_Kysely_ — excellent typed query builder; Drizzle covers the same ground plus schema and migrations.
_TypeORM / Sequelize_ — decorator-era designs with weaker inference. _Raw SQL + a mapper_ — a
legitimate senior choice, but we would then hand-roll migrations, types, and composition.
**Health** Very widely adopted and actively developed. Public DTOs are hand-written in
`@repo/contracts`, not derived from tables (`drizzle-zod` was considered and not adopted — a
column addition must not change an API by default).
**Exit** Medium — queries are confined to `*.repository.ts` files, which is the seam that makes this
bounded rather than repo-wide.
**Open issue:** `1.0.0-rc.4` exists (rewritten kit, v3 migration folders, RQB v2) but `latest` is
still `0.45.2`, roughly a year after the v1 betas began. Decided in
[ADR-0008](../adr/0008-drizzle-version-selection.md); trigger to revisit is v1 GA. See the risk
register below.

### ioredis 6.0

**Why** Mature Redis client with cluster support, pipelining, and Lua scripting. Used by
`@repo/cache` and by Better Auth's secondary storage.
**Instead of** _node-redis_ — comparable, and now a genuinely open choice: the reason to prefer
ioredis was that BullMQ targeted it, and BullMQ is gone. Kept because it is already wired and
behind a port. _Upstash HTTP client_ — vendor-specific.
**Health** Stable and ubiquitous. v6 adds RESP3 and fixes a cluster `MOVED` prototype-pollution path.
**Exit** Low — behind `@repo/cache`.
**Operational note:** Redis still needs `maxmemory-policy: noeviction`, now because it holds the
Stripe webhook replay guard and outbox side-effect claims. Evicting either turns an at-most-once
guarantee into a duplicate.

### BullMQ and Trigger.dev (both removed)

**Why BullMQ was here:** Redis-backed queues with retries, backoff, rate limiting, job schedulers,
flows, and priorities, with zero marginal infrastructure cost because Redis was already present for
caching. It is the default Node queue and was the right choice for the job.

**Why Trigger.dev was considered and dropped earlier:** durable execution for multi-step workflows
surviving restarts. No such workload emerged
([ADR-0009](../adr/0009-bullmq-only-background-work.md)).

**Decision:** the job concept is gone
([ADR-0014](../adr/0014-single-transport-and-no-background-worker.md)) — not just the adapter. There
is no `JobQueue` port and no `CtxPorts.jobs`. The transactional outbox stayed; delivery is
in-process, drained after a mutating request commits. What that gives up: retries beyond a simple
backoff, a dead-letter queue, alerting, and anything on a schedule.

**Revisit if** a job must not be lost, or work must happen on a timer. Neither is expressible
today. BullMQ remains the obvious first candidate, and re-adding it means re-introducing a port —
`pg-boss` and Graphile Worker become more attractive if the goal is to drop Redis rather than to
add a worker.

### `@aws-sdk/client-s3`

**Why** The S3 API is the de facto object-storage standard; one client works against R2, MinIO, S3,
and B2. Presigned URLs let uploads bypass our servers entirely.
**Instead of** _Cloudflare's R2 SDK_ — vendor lock-in in exactly the place we refuse it. _uploadthing /
Vercel Blob_ — pleasant DX, hosted, vendor-coupled. _`minio` client_ — narrower.
**Health** AWS-maintained; v3 is modular, so we import only S3.
**Exit** Low — behind the `FileStore` port.

### Sharp 0.35

**Why** libvips bindings: the fastest and highest-quality image processing available to Node, with
AVIF/WebP output and EXIF stripping.
**Instead of** _jimp_ — pure JS, dramatically slower. _ImageMagick via CLI_ — process spawning and
a broader attack surface. _Cloudflare Images / imgix_ — hosted, and we already need worker CPU.
**Health** The standard; Next.js itself depends on it.
**Exit** Low — used in one worker consumer via `@repo/storage/image`. Note it is a native
module, which is why the worker image installs it separately. Next.js lists the same package as
an optional dependency for `next/image`; that copy is not declared in app manifests.

### Resend 6.18 + React Email 1.0

**Why** Resend gives a clean API, good deliverability defaults, and webhook events without an
enterprise onboarding process. React Email means templates are components — reviewable in PRs,
testable, and previewable locally — instead of hand-maintained HTML tables.
**Instead of** _SendGrid / Mailgun_ — capable, dated APIs and heavier setup. _Amazon SES_ — cheapest at
volume and the likely destination if volume grows; worse DX, and behind the `Mailer` port so the
switch is contained. _Postmark_ — excellent transactional deliverability, a strong alternative.
_Nodemailer + SMTP_ — used locally against Mailpit; not a deliverability strategy on its own.
**Health** Resend: fast-growing, well-funded, and the maintainer of React Email. React Email: the
standard for React email templating.
**Exit** Low for Resend (one adapter). Low-Medium for React Email — templates would need porting, but
they render to plain HTML.

### Stripe 22.3

**Why** The only realistic choice for global card payments, subscriptions, tax, and invoicing.
Best-in-class documentation, test mode, and webhook tooling.
**Wired** `@repo/payments` (`createStripePaymentGateway`) — catalog, Checkout `mode: subscription`,
Customer Portal, `webhooks.constructEvent`, entitlement metadata. Prefer restricted keys (`rk_`) in
production; test keys rejected when `APP_ENV=production`.
**Instead of** _Paddle / Lemon Squeezy_ — merchant-of-record models that remove sales-tax burden and
are genuinely better for small SaaS; less flexible and higher fees. _Braintree / Adyen_ —
enterprise-oriented. _Polar_ — promising for developer products, younger. _Metronome / usage billing_
— not in scope; SaaS subscriptions only.
**Health** The industry standard.
**Exit** High in practice — payment providers are the stickiest integration in any product. Mitigated
by keeping Stripe behind the `PaymentGateway` port and never letting Stripe types into a slice.

---

## 5. Observability

### OpenTelemetry (`@opentelemetry/sdk-node` 0.221)

**Why** The only vendor-neutral instrumentation standard. Instrumenting once and choosing the backend
later is the difference between a swappable decision and a rewrite. We register **explicit**
instrumentations (HTTP, undici, ioredis, runtime-node) rather than
`@opentelemetry/auto-instrumentations-node`, which pulls dozens of unused libraries into the
bundled api/worker images.
**Instead of** _Vendor agents (Datadog, New Relic)_ — better turnkey experience, and re-instrumentation
is the price of leaving. _No tracing_ — not an option for a distributed system with queues.
_Auto-instrumentations meta-package_ — convenient, but ~40 instrumentations we do not run.
**Health** CNCF, industry-wide adoption. The JS SDK's `0.x` versioning on some packages is a known
annoyance rather than a stability signal.
**Exit** Low — that is the entire point of the standard.

### Pino 10.3

**Why** Fastest mature Node logger, JSON-first, with child loggers, serializers, and built-in
redaction. Asynchronous transports keep logging off the hot path.
**Instead of** _Winston_ — slower, heavier API. _Bunyan_ — largely unmaintained. _console.log_ — no
levels, structure, or redaction.
**Health** Stable and widely used.
**Exit** Low — behind `@repo/logger`.

### `@sentry/node` 10.73 (capture-only)

**Why** Logs answer "what happened in this request"; nothing answered "what is broken this week".
Sentry groups the same exception across requests, releases and hosts, which is the one thing OTel
and Pino do not do. Used purely as an exception sink — no tracing, no auto-instrumentation.
**Instead of** _GlitchTip_ — not an alternative but the same protocol, so this adapter drives a
self-hosted GlitchTip unchanged; the choice is a DSN. _`@sentry/nextjs`_ — rejected: its build
plugin, edge/node instrumentation and source-map upload are what made a previous attempt fail.
_Loki + Grafana_ — already self-hosted here and good at log search, but it matches text rather
than fingerprinting exceptions, so "three occurrences of one bug" stays manual work.
**Health** Actively maintained, the reference implementation of its own protocol.
**Exit** Low — behind the `ErrorTracker` port in `@repo/observability`. Removing it is deleting
one adapter file; every boundary already falls back to `createNoopErrorTracker()`.
**Version note:** v8+ bundles its own OpenTelemetry SDK and initialises it by default, which
collides with the `NodeSDK` this repo already starts. `skipOpenTelemetrySetup: true` and
`defaultIntegrations: false` are load-bearing, not tuning — `sentry-tracker.test.ts` asserts the
global `TracerProvider` is untouched. Treat an upgrade that changes those options as breaking.

### PostHog 1.408

**Why** Product analytics, funnels, session replay, and feature flags in one tool, **self-hostable**,
which is unusual in this category and decisive for data residency.
**Instead of** _Amplitude / Mixpanel_ — stronger analysis tooling, not self-hostable, no flags.
_Google Analytics_ — not product analytics, and a privacy liability. _Plausible / Umami_ — good
privacy-first web analytics, not product analytics. _Separate flag vendor (LaunchDarkly, Flagsmith)_ —
another vendor for something PostHog already provides.
**Health** Large, well-funded, open-source core.
**Exit** Low — behind `@repo/analytics` and `@repo/flags`, both of which have env-based providers for
tests, so the interface is already exercised against two implementations.

---

## 6. Quality & testing

### Oxlint 1.76 + `oxlint-tsgolint` 7.0.2001

**Why** 50–100× faster than ESLint, no plugin-configuration archaeology, and — decisively — a
**type-aware backend built directly on TypeScript 7** (`typescript-go`), which went **stable on
2026-07-22** with 59 of typescript-eslint's 61 type-aware rules. This is what preserves
`no-floating-promises` and `no-misused-promises`, the two rules that catch real production bugs no
syntax-only linter can see.
**Instead of** _ESLint + typescript-eslint_ — the incumbent, and currently the blocked path:
typescript-eslint **closed its TypeScript 7 support request as "not planned"**, with ESLint core
queued behind it, because TypeScript 7.0 shipped without a stable programmatic API. Choosing ESLint
today means choosing TypeScript 6. _Biome_ — a strong unified toolchain and the closest competitor;
Oxlint has broader rule coverage and, critically, type-aware linting on TS 7.
**Health** Oxc/VoidZero (the Rolldown and Vite team), used in production by Kibana, Sentry, Renovate,
Preact, PostHog, and date-fns.
**Exit** Low — lint configuration is disposable, and `@oxlint/migrate` exists in the other direction.
**Coupling to note:** `oxlint-tsgolint` is versioned against a specific TypeScript release
(`7.0.2001` = tsgolint patch 0 for TypeScript 7.0.2), so it must be upgraded in lockstep with
`typescript`. Renovate is configured accordingly. It also does not support `baseUrl` in `tsconfig`,
which is why [04](./04-conventions.md#import-paths) bans it.

### Oxfmt 0.61

**Why** ~30× faster than Prettier, passes **100 % of Prettier's JavaScript and TypeScript conformance
tests**, and has built-in import sorting and **Tailwind class sorting** — which removes
`prettier-plugin-tailwindcss` and `@ianvs/prettier-plugin-sort-imports` as dependencies.
**Instead of** _Prettier_ — the incumbent, slower, needs plugins for the above. _Biome format_ —
fast and good, but then two tools from two ecosystems. _dprint_ — fast, smaller community.
**Health** Same team as Oxlint, weekly releases.
**Exit** Very low — a formatter is a one-command switch; the risk is a noisy reformat commit, nothing
more.
**Risk to state plainly:** it is **pre-1.0 (0.61.0)**, Prettier plugins are unsupported, and its
default `printWidth` is 100 rather than 80. See the risk register.

### Knip 6.29

**Why** Finds unused files, exports, and dependencies across a monorepo. In a repo with twenty
packages, dead code accumulates invisibly, and _undeclared_ dependencies are worse — they break the
moment pnpm's isolated install is respected.
**Instead of** _depcheck_ — dependencies only, weaker monorepo support. _ts-prune_ — exports only,
unmaintained. _Manual review_ — does not happen.
**Health** Actively maintained, monorepo-aware.
**Exit** Very low.

### CSpell 10

**Why** Typos in identifiers, UI copy, and docs are permanent embarrassments and break searchability.
A committed project dictionary makes new jargon a reviewed diff rather than noise.
**Instead of** _typos-cli_ — faster, Rust, smaller dictionary and less config. _Editor-only spelling_ —
not enforced in CI, so it does not hold.
**Health** Mature, stable.
**Exit** Very low.

### React Doctor 0.9

**Why** Catches React-specific security, accessibility, and performance issues that Oxlint does not
cover (reduced-motion, client-side redirects, eager heavy imports). The CLI is pinned and run through
`make react-doctor`, same as Knip — not `npx @latest` and not the unpinned GitHub Action.
**Instead of** _eslint-plugin-react-hooks / jsx-a11y on ESLint_ — blocked by TypeScript 7 (see
Oxlint). _Manual review_ — does not happen on every PR. _The vendor GitHub Action_ — a mutable
tag with write permissions; this repo pins SHAs and composes `make` targets.
**Health** Pre-1.0 (0.9.13), Million Software. Nested `oxlint@1.79` is isolated from the repo's
1.76 toolchain. `playwright-core` is overridden to 1.62.0 in `pnpm-workspace.yaml` so it cannot
split from `@playwright/test`.
**Exit** Very low — a scanner, not a runtime dependency.

### Lefthook 2.1

**Why** Single Go binary, no Node spawn per hook, parallel execution, declarative YAML, and native
staged-file globbing (so `lint-staged` is unnecessary).
**Instead of** _Husky + lint-staged_ — the incumbent; two dependencies, shell scripts, slower.
_simple-git-hooks_ — minimal, no parallelism or staged-file handling.
**Health** Stable, widely used, language-agnostic.
**Exit** Very low.

### Portless 0.15

**Why** Named `*.localhost` URLs for every local app so Better Auth, `NEXT_PUBLIC_APP_URL`, and
humans stop chasing ephemeral ports. Injects `PORT` / `HOST` / `PORTLESS_URL`; HTTPS is optional.
**Instead of** _Hardcoded `localhost:3000`_ — collides the moment two apps or two worktrees run.
_Caddy/Traefik on the laptop_ — another compose file for a problem Portless solves in the `dev`
script. _`mkcert` + `/etc/hosts` by hand_ — the same job, more ceremony.
**Health** Vercel Labs, Apache-2.0, active 2026. Dev-only; not in images.
**Exit** Very low — `PORTLESS=0` restores port-based `dev` scripts.

### commitlint 21

**Why** Enforces Conventional Commits, which is what makes the squashed history readable and
changelog generation possible.
**Instead of** _Convention by review_ — inconsistent within a week. _commitizen_ — an interactive
prompt, complementary rather than an alternative.
**Health** Stable, the standard.
**Exit** Very low.

### Changesets 3.0

**Why** Explicit, author-declared release intent per package, reviewed alongside the code. See
[12 §5](./12-git-ci-release.md#why-changesets-rather-than-semantic-release).
**Instead of** _semantic-release_ — infers versions from commit messages, which is guesswork in a
monorepo. _Lerna_ — legacy, largely superseded. _Manual versioning_ — forgotten, then wrong.
**Health** Maintained by the Changesets team; the monorepo standard.
**Exit** Very low.

### Vitest 4.1

**Why** Vite-native, so TypeScript, ESM, and path aliases work with no configuration; fast watch mode;
Jest-compatible API; and workspace projects let one command run node and jsdom suites with different
configuration.
**Instead of** _Jest_ — the incumbent, slower, and painful with ESM and TypeScript path resolution.
_node:test_ — zero dependencies and genuinely tempting; weaker watch mode, mocking, and coverage
tooling. _Bun test_ — fast, tied to Bun.
**Health** VoidZero-adjacent, huge adoption, stable v4.
**Exit** Low — the API is Jest-shaped, so a migration is mostly config.

### Testing Library

**Why** Enforces querying by accessible role and label, so tests resemble how users (and screen
readers) perceive the UI. Tests written this way survive refactors and surface accessibility gaps as
a side effect.
**Instead of** _Enzyme_ — dead, and it encouraged testing internals. _Direct DOM assertions_ — brittle.
**Health** The standard, effectively feature-complete.
**Exit** Low.

### Playwright 1.62

**Why** Cross-browser, auto-waiting (which eliminates the largest source of E2E flake), trace viewer
for post-mortem debugging, parallel execution, and `storageState` for cheap authenticated fixtures.
**Instead of** _Cypress_ — good DX, single-tab architecture, slower, and cross-origin flows are
awkward. _Selenium_ — legacy. _Puppeteer_ — Chromium-only, no test runner.
**Health** Microsoft-maintained, now the category default.
**Exit** Medium — specs would need rewriting, but there are only ~20.

### MSW 2.15

**Why** Intercepts at the network layer (Service Worker in the browser, `http` interception in Node),
so the component's real fetching code runs. Handlers are shared between component tests, Node tests,
and local development against a not-yet-built API.
**Instead of** _Mocking the fetch function_ — skips the code under test. _Mocking the query client_ —
tests the mock. _A stub server_ — another process to run and keep in sync.
**Health** Stable v2, widely adopted.
**Exit** Low.

### axe-core 4.12 + `@axe-core/playwright`

**Why** The industry-standard accessibility rule engine, catching roughly 30–40 % of real WCAG issues
automatically — which is worth having in CI precisely because those regressions are otherwise
invisible.
**Instead of** _pa11y_ — also axe-based, less integrated. _Lighthouse_ — broader, shallower a11y.
_Manual auditing only_ — necessary for the other 60 %, but does not scale to every PR.
**Health** Deque-maintained, the reference implementation.
**Exit** Very low.

### k6 (Docker — `grafana/k6`)

**Why** Load tests written in JavaScript with thresholds that pass or fail, so a load test is a
gate rather than a report nobody reads. Scripts are not Node modules — they run on k6's Go JS
runtime. We invoke the official `grafana/k6` image via `make load` (same pattern as ZAP), so
neither a host binary nor an npm fake is required.
**Instead of** _Artillery_ — comparable, YAML-first. _JMeter_ — heavyweight, XML. _Locust_ — Python,
which adds a language to the repo. _A pnpm/TypeScript script_ — cannot drive k6 VUs; Node is the
wrong runtime.
**Health** Grafana Labs, actively developed.
**Exit** Very low — nightly scenarios, not in the PR path (`perf/k6/`, `make load`).

### OWASP ZAP (Docker)

**Why** Baseline spider + passive scan against a running origin catches missing headers and common
misconfigurations without a full penetration engagement. Shipped as the official
`zaproxy/zap-stable` Docker Hub image — not an npm dependency.
**Instead of** _Burp_ — manual/commercial. _Nikto_ — noisier, less tuned for SPAs.
**Health** OWASP flagship, active.
**Exit** Very low — `make zap` + nightly workflow; rule overrides in `perf/zap/rules.tsv`.

---

## 7. Documentation

### Fumadocs and Scalar (both removed)

**Why they were here:** Fumadocs gave Next.js-native documentation — MDX with type-safe
frontmatter, generated navigation, built-in search — as a library inside _our_ app rather than a
separate site generator. Scalar rendered the committed OpenAPI document as an interactive
reference with a request client.

**Decision:** removed with `apps/docs` and `apps/api`
([ADR-0014](../adr/0014-single-transport-and-no-background-worker.md)). The site published the same
markdown that lives in `docs/**`, which GitHub already renders, and Scalar had no spec left to
render.

**What was lost, concretely:** `make docs-build` was the only gate that compiled
`docs/{architecture,adr,runbooks,security}` as MDX. MDX accepts less than Markdown does — an HTML
comment fails the build — so malformed MDX and broken links in that tree are no longer caught by
anything.

**Revisit if** the docs need search, versioning, or a published URL. Content is plain Markdown, so
Fumadocs, Nextra, Docusaurus, or VitePress are all still open; the decision that made Fumadocs win
was wanting it inside the same Next app, which no longer applies with one product app.

### Mermaid

**Why** Diagrams as text: reviewable in PRs, diffable, no binary assets, and rendered natively by
GitHub. An architecture diagram in a proprietary tool is stale within a quarter.
**Instead of** _Excalidraw / Figma_ — better for exploratory sketching, not for versioned truth.
_PlantUML_ — needs Java. _D2_ — nicer output, needs a binary and lacks native GitHub rendering.
**Health** Ubiquitous.
**Exit** Very low.

---

## 8. Rejected dependencies

Things a repo like this often includes, and why this one does not.

| Rejected                                       | Why                                                                                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ESLint + Prettier**                          | ESLint's type-aware path is blocked on TypeScript 7 (typescript-eslint: "not planned"); Oxlint + Oxfmt are 30–100× faster and cover both.                                                                                |
| **neverthrow / fp-ts**                         | `Result` types are viral across every layer; exceptions plus typed errors mapped at the boundary give us the same guarantees where they matter, with readable orchestration code.                                        |
| **`@t3-oss/env-nextjs`**                       | ~80 lines of Zod, and we need per-app schema composition and custom cross-field rules anyway.                                                                                                                            |
| **clsx + tailwind-merge as separate concerns** | Both are needed, but exposed only through a single `cn()` in `@repo/ui`, so call sites depend on our helper, not the libraries.                                                                                          |
| **A DI container (tsyringe, TypeDI)**          | Plain function composition gives the same testability without decorators, `reflect-metadata`, or startup-order magic.                                                                                                    |
| **tRPC**                                       | Replaced by oRPC for the private API ([ADR-0011](../adr/0011-orpc-private-api.md), [ADR-0012](../adr/0012-orpc-2-private-api.md)). Same compile-time types; we no longer want SuperJSON or a React provider.             |
| **GraphQL (Apollo, Pothos, urql)**             | We control the only internal consumer (oRPC is better there) and third parties want REST. GraphQL adds a schema, resolvers, N+1 concerns, and a client cache for no gain here.                                           |
| **Prisma**                                     | Considered seriously; rejected for the Rust engine binary, a separate schema language, and generated-client friction in a monorepo.                                                                                      |
| **Redux Toolkit**                              | Client state is small; Zustand is the allowed tool if a store is ever needed.                                                                                                                                            |
| **Storybook**                                  | Genuinely useful, and genuinely heavy: a second build system, a second dependency graph, and constant maintenance. Component tests in `@repo/ui` cover the primitives we ship. Revisit if a dedicated design team joins. |
| **Kubernetes**                                 | A control plane to operate, upgrade, and secure for orchestration a Compose file already provides at this scale. Images are standard OCI, so the door stays open.                                                        |
| **Terraform**                                  | OpenTofu is the MIT-licensed, neutrally-governed continuation.                                                                                                                                                           |
| **Husky + lint-staged**                        | Lefthook does both, faster, as one binary.                                                                                                                                                                               |
| **semantic-release**                           | Changesets makes release intent explicit and reviewable in a monorepo.                                                                                                                                                   |
| **Lodash**                                     | Modern JavaScript covers nearly all of it; the handful we want lives in `@repo/utils`.                                                                                                                                   |
| **Axios**                                      | Native `fetch` is universal in Node 24 and the browser.                                                                                                                                                                  |
| **Moment.js**                                  | Deprecated by its own maintainers.                                                                                                                                                                                       |
| **A separate feature-flag vendor**             | PostHog provides flags, and our interface makes the provider swappable.                                                                                                                                                  |
| **A separate cron service**                    | Nothing runs on a schedule today, and a cron service would be the _right_ answer if something needed to — see [ADR-0014](../adr/0014-single-transport-and-no-background-worker.md).                                      |
| **`uuid`**                                     | Postgres 18 has native `uuidv7()`; the application-side generator is a few lines using `node:crypto`.                                                                                                                    |
| **A logging SaaS SDK**                         | Pino writes JSON to stdout; shipping is the platform's job, which keeps the aggregator swappable.                                                                                                                        |

---

## 9. Risk register

The dependencies that need active watching, with the trigger that would make us act. This section
exists because the honest answer to "is this stack safe" is "mostly, and here is precisely where it
is not".

| #   | Risk                                                                                                                                                               | Severity   | Assessment & mitigation                                                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **TypeScript 7 has no stable programmatic API until 7.1** (~Q4 2026). typescript-eslint declined TS 7 support; Volar-based template checking cannot run on it.     | High       | Our toolchain is chosen to be unaffected: Oxlint's type-aware backend is built on `typescript-go` directly, and we use no Vue/Svelte/Astro template checking. `@typescript/typescript6` is the escape hatch if a tool we adopt embeds the old API (not currently a workspace dependency). **Trigger to revisit:** a tool we depend on turns out to embed the compiler. |
| R2  | **Oxfmt is pre-1.0 (0.61.0)** with weekly releases and no Prettier-plugin support.                                                                                 | Low        | It passes 100 % of Prettier's JS/TS conformance tests, and a formatter is the single most replaceable tool in any repo — worst case is one reformat commit back to Prettier. Version pinned exactly; upgrades are their own PR so a formatting-diff commit is never mixed with logic.                                                                                  |
| R3  | **`oxlint-tsgolint` is version-locked to a specific TypeScript release.**                                                                                          | Medium     | Renovate groups `typescript` and `oxlint-tsgolint` so they move together. If tsgolint lags a TypeScript release, we hold both back — a typecheck and a linter that disagree about the language is worse than being one patch behind.                                                                                                                                   |
| R4  | **Drizzle v1 has been in beta/RC for ~a year**; `latest` is still 0.45.2.                                                                                          | Medium     | Stay on 0.45.2 until v1 GA ([ADR-0008](../adr/0008-drizzle-version-selection.md)). Queries are confined to `*.repository.ts`, so the migration-folder format change is bounded.                                                                                                                                                                                        |
| R5  | **Base UI** (`@base-ui/react` 1.7.0) was **renamed** from `@base-ui-components/react`.                                                                             | Low-Medium | It is now shadcn/ui's default with 6M+ weekly downloads, and an official Radix↔Base migration skill exists in both directions. shadcn components live in our repo, so we can patch them ourselves.                                                                                                                                                                     |
| R7  | **Better Auth moves fast** (1.6.25, with 1.7 in RC).                                                                                                               | Medium     | Pin exactly, read changelogs, and treat minor upgrades as reviewed PRs with the auth E2E suite as the gate. Auth tables are ours, so a bad release is a hold, not an outage.                                                                                                                                                                                           |
| R8  | **Next.js majors are disruptive** (the 15→16 `middleware`→`proxy` rename is the current example, and `middleware.ts` still compiles while silently doing nothing). | Medium     | Business logic is outside `apps/web`, so a Next migration is one app. Majors get a dedicated PR, the official codemods, and an explicit check that deprecated file conventions are actually gone.                                                                                                                                                                      |
| R9  | **There is no background execution at all.** Async work rides the request that drains the outbox: no retries beyond a backoff, no DLQ, no schedule.                | Medium     | Accepted for a boilerplate; re-add a queue per [ADR-0014](../adr/0014-single-transport-and-no-background-worker.md) as soon as a real workload needs delivery guarantees.                                                                                                                                                                                              |
| R10 | **Zod is used everywhere** — contracts, env, forms, API, jobs.                                                                                                     | Medium     | Accepted deliberately. A migration would be large but mechanical, and the alternative (a weaker validation abstraction) is worse in the place we depend on most.                                                                                                                                                                                                       |
| R11 | **Vendor concentration**: Cloudflare provides DNS, CDN, WAF, and object storage.                                                                                   | Medium     | Each is individually replaceable (S3 API for storage, any DNS provider, any CDN), and none is imported in application code. Documented as a known concentration rather than pretended away.                                                                                                                                                                            |
| R12 | **Sharp is a native module.**                                                                                                                                      | Low        | Worker base image and architecture are pinned; multi-arch images are built and tested.                                                                                                                                                                                                                                                                                 |
| R13 | **Supply-chain compromise of any dependency.**                                                                                                                     | High       | Renovate enforces a 3-day minimum release age for non-security updates, lockfiles are committed and frozen in CI, `pnpm audit` and CodeQL run in CI, Trivy scans images, action SHAs are pinned, and provenance attestations are generated.                                                                                                                            |
| R14 | **oRPC 2 is still on the `beta` dist-tag** (`latest` remains 1.15). We pin `2.0.0-beta.33`.                                                                        | Medium     | Accepted in [ADR-0012](../adr/0012-orpc-2-private-api.md). Server and client must upgrade together (wire-incompatible with v1). Renovate does not automerge `@orpc/*`. Trigger: `latest` points at 2.x — catalog bump off the beta pin. Do not generate public OpenAPI from oRPC. Do not enable GET without the GET CSRF plugin.                                       |

### Review cadence

This document is reviewed **quarterly**, and immediately whenever: a dependency is added or removed,
a risk-register trigger fires, a major version of a load-bearing dependency ships, or a security
advisory affects us. The review asks one question per entry — _would we still choose this today?_ —
and records the answer.
