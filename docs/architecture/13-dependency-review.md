# 13 — Dependency review

Every dependency is a permanent liability: supply-chain surface, upgrade work, and a ceiling on
what can change later. This document justifies each one and records how we would leave it.

**The bar:** does it solve a genuinely hard problem, is it likely to outlive our project, and is
replacing it tractable? If we could replace it with under ~150 lines of our own code, we write the
lines.

Each entry carries:

- **Why** — what it does that we will not do ourselves.
- **Instead of** — the alternatives considered and why they lost.
- **Health** — maintenance, adoption, ecosystem maturity, as of 2026-07-30.
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

### `@typescript/typescript6`

**Why** Ships a `tsc6` binary re-exporting the TypeScript 6 API, so any tool that still needs the old
programmatic API can run side by side. This is the insurance policy that makes adopting TypeScript 7
a reversible decision.
**Instead of** Pinning the whole repo to TypeScript 6.
**Health** Maintained by the TypeScript team explicitly as a transition bridge.
**Exit** Remove it once every tool we use targets the 7.1 API.

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
lives in `@repo/core` and Next is confined to `apps/web`. A migration would rewrite one app, not the
system.

### React 19.2

**Why** Server Components, Actions, `useOptimistic`, `useFormStatus`, and the compiler.
**Instead of** _Vue / Svelte / Solid_ — all technically fine; React wins on ecosystem depth, hiring, and
the fact that every other choice in this stack (shadcn/ui, Base UI, TanStack, Tiptap) targets it
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
**1.6.0** with 6M+ weekly downloads. The package was **renamed**: the maintained package is
`@base-ui/react`, not the older `@base-ui-components/react` (which stopped at `1.0.0-rc.0`). We
initialise on Base UI, so our components sit on the path upstream actively develops, and a
first-party migration skill exists in the other direction if we ever need it.
**Instead of** _Radix UI_ — mature, battle-tested, and the safe conservative pick; we choose Base UI
because it is where shadcn/ui's new work lands, and because it is built by the same core team with
the benefit of Radix's lessons. _MUI / Mantine / Chakra_ — prescriptive design and heavy runtime
theming; customisation means fighting the library. _Headless UI_ — narrower component set.
**Health** Base UI: 1.6.0 stable, regular releases, MUI-team provenance. shadcn/ui: the dominant
pattern for React design systems.
**Exit** Low for shadcn/ui (the code is ours). Medium for Base UI, and the existence of an official
Radix↔Base migration skill bounds it further.

### `@hugeicons/react`

**Why** Large, consistent, multi-style icon set with a tree-shakeable React package.
**Instead of** _Lucide_ — the usual default; smaller and excellent, and the honest fallback if
HugeIcons' licensing or maintenance ever disappoints. _Heroicons_ — small set. _react-icons_ —
aggregates many sets with inconsistent metrics and poor tree-shaking.
**Health** Actively developed commercial project with a free tier.
**Exit** Low — icons are used through a single `@repo/ui/icons` wrapper, so swapping the set is one
file plus a name mapping. That wrapper exists specifically because this is the dependency most
likely to be replaced for non-technical reasons.

### Motion 12.43

**Why** Declarative animation with a spring-physics model, layout animations, gesture support, and a
hardware-accelerated path. Layout animation in particular is genuinely hard to hand-roll.
**Instead of** _CSS transitions_ — used for the simple majority of cases anyway; Motion is for the rest.
_GSAP_ — more powerful for timeline work, heavier, and its licensing model is less comfortable for a
foundation. _React Spring_ — similar capability, smaller community. _Anime.js_ — not React-shaped.
**Health** The dominant React animation library (formerly Framer Motion), now independent.
**Exit** Low — animations are localised and degrade gracefully to CSS.

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
integration (tRPC, drizzle-zod, `@hono/zod-openapi`, RHF all target it first), which for us outweighs
kilobytes. _ArkType_ — impressive performance, younger. _Yup_ — weaker inference. _TypeBox_ —
JSON-Schema-first, less ergonomic. _io-ts_ — functional style we do not want repo-wide.
**Health** The standard for TypeScript validation.
**Exit** High — it is woven through contracts, env, forms, API, and jobs. This is an accepted,
deliberate concentration: the alternative is a weaker abstraction in the place we most rely on.

### TanStack Query 5.101

**Why** Server-state caching, deduplication, background refetching, pagination, and optimistic updates
— roughly 3,000 lines of subtle logic we would otherwise write badly.
**Instead of** _SWR_ — lighter, less capable on mutations and invalidation. _RTK Query_ — requires
Redux. _Apollo_ — GraphQL-oriented. _Hand-rolled `useEffect` fetching_ — the reason this library
exists.
**Health** Framework-agnostic core, huge adoption, exemplary maintenance.
**Exit** Medium — hooks are wrapped per feature, so the surface is contained.

### Zustand 5.0

**Why** Minimal client state with no provider, no boilerplate, and a hook-based selector API. Used
**only** for genuine client state — server data belongs to TanStack Query, URL state to nuqs, form
state to RHF. That narrow scope is why a tiny library suffices.
**Instead of** _Redux Toolkit_ — far more ceremony than our scope needs. _Jotai / Valtio_ — fine
alternatives with different mental models. _Context + `useReducer`_ — no selector granularity, so
re-render storms.
**Health** Small, stable, widely used.
**Exit** Low — few stores, small surface.

### TanStack Table 8.21

**Why** Headless table logic (sorting, filtering, grouping, pagination, virtualisation-ready) with
markup and styling entirely ours.
**Instead of** _AG Grid_ — enormously capable, heavy, and commercially licensed for the useful
features. _MUI DataGrid_ — ties us to MUI. _Hand-rolled_ — feasible until column pinning and grouped
sorting arrive.
**Health** Stable v8. **A v9 is in beta** — we stay on v8 until it is stable (see risk register).
**Exit** Medium — behind `@repo/ui/table`.

### Tiptap 3.29

**Why** ProseMirror is the only genuinely correct rich-text model (document schema, transactions,
collaborative-editing-ready), and Tiptap makes it usable with a React-friendly extension API.
**Instead of** _Lexical_ — Meta-built, strong, smaller extension ecosystem. _Slate_ — flexible with
a history of instability. _Quill / TinyMCE / CKEditor_ — jQuery-era architecture or restrictive
licensing. _contenteditable directly_ — a well-documented path to despair.
**Health** Active commercial project on ProseMirror's stable foundation. Some advanced extensions are
paid, which is worth knowing before designing a feature around them.
**Exit** High — editor content format and extensions are deeply coupled. Isolated behind
`@repo/ui/editor` and lazy-loaded, and content is stored as ProseMirror JSON (portable to any
ProseMirror-based editor), which is the mitigation.

### Recharts 3.10

**Why** Declarative, composable React charting on SVG; covers the dashboard cases (line, bar, area,
pie, composed) without a custom visualisation grammar.
**Instead of** _Chart.js_ — canvas-based, imperative, awkward in React. _Visx_ — lower-level Airbnb
primitives, more power and more code per chart. _D3 directly_ — the right answer for bespoke
visualisation, overkill for dashboards. _Observable Plot_ — grammar-of-graphics, less React-idiomatic.
**Health** Mature and stable; the library shadcn/ui's chart components build on.
**Exit** Low-Medium — behind `@repo/ui/chart` and lazy-loaded.

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

### Sonner 2.0

**Why** Toast notifications with correct stacking, swipe dismissal, promise states, and accessibility.
Small and finished.
**Instead of** _react-hot-toast_ — comparable. _Radix/Base UI Toast primitive_ — more assembly for the
same result. _Hand-rolled_ — animation and a11y details make this bigger than it looks.
**Health** Small, stable, widely adopted (and the shadcn/ui default).
**Exit** Low — one wrapper in `@repo/ui`.

### date-fns 4.4

**Why** Immutable, tree-shakeable date arithmetic with first-class time-zone support in v4. We use it
for **arithmetic and parsing only** — formatting goes through `Intl` so it is locale-correct without
shipping locale data.
**Instead of** _Day.js_ — smaller but plugin-based and mutable-ish. _Luxon_ — good, larger, class-based.
_Moment_ — deprecated by its own authors. _Temporal_ — the eventual right answer; once runtime support
is universal this dependency largely disappears, which is a point in its favour.
**Health** Very widely used, stable.
**Exit** Low — function-level, mechanical.

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

### tRPC 11.18

**Why** Compile-time end-to-end types between our own client and server with no codegen and no
schema-drift window. Middleware composition gives us the layered `public`/`protected`/`org`
procedures that make authorization structural.
**Instead of** _REST for internal calls too_ — loses type safety or requires codegen. _GraphQL_ — a
schema, resolvers, N+1 concerns, and a client cache for a problem we do not have (we control the only
consumer). _ORPC / TS-Rest_ — similar ideas, smaller ecosystems. _Server Actions only_ — insufficient
for queries, caching, and non-form interactions.
**Health** Mature v11, large adoption, excellent TanStack Query integration.
**Exit** Medium — resolvers are thin over `@repo/core`, so replacing the transport is a
transport-layer job. This is precisely what the one-core-two-transports design protects.

### tsdown 0.22

**Why** Bundles `apps/api` and `apps/worker` into a single ESM artifact for Docker runners so
source-only workspace packages resolve at build time and the runtime image does not ship
`node_modules` for the whole monorepo. Rolldown-based, TypeScript-native, and small enough that the
config lives next to each app.
**Instead of** _tsup_ — esbuild-based and effectively in maintenance; _esbuild_ directly — more
boilerplate for the same job; _shipping source + node_modules_ — large images and workspace symlink
pain; _pnpm deploy_ alone — workable but still ships far more than one JS file.
**Health** Active under the Rolldown org; pin exactly.
**Exit** Low — replace the `build` script and Docker `CMD`; application source is unchanged.

### Hono 4.12 + `@hono/zod-openapi`

**Why** A small, fast, Web-standard (`Request`/`Response`) framework, and `@hono/zod-openapi` derives
the OpenAPI 3.1 document **from the same Zod schemas that validate requests** — so the spec cannot
drift from the implementation, because there is no second source of truth.
**Instead of** _Express_ — huge ecosystem, callback-era design, no types, and version 5 arrived very
late. _Fastify_ — fast and mature with good JSON-Schema validation, but we would then have two schema
languages (JSON Schema and Zod) instead of one. _Elysia_ — excellent types, Bun-first. _NestJS_ —
decorators, DI, and modules layered on Express/Fastify; a framework-shaped opinion that duplicates
our own architecture. _Next route handlers for the public API_ — couples the public contract to the
UI app's deploy and runtime.
**Health** Very active, widely deployed, runtime-portable.
**Exit** Low-Medium — routes are thin; the OpenAPI generation is the part that would need replacing.

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

### Drizzle ORM 0.45 + drizzle-kit + drizzle-zod

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
**Health** Very widely adopted and actively developed.
**Exit** Medium — queries are confined to `*.repository.ts` files, which is the seam that makes this
bounded rather than repo-wide.
**Open issue:** `1.0.0-rc.4` exists (rewritten kit, v3 migration folders, RQB v2) but `latest` is
still `0.45.2`, roughly a year after the v1 betas began. See Q1 in the
[index](./README.md#7-open-questions-requiring-your-decision) and the risk register below.

### ioredis 6.0

**Why** Mature Redis client with cluster support, pipelining, and Lua scripting. BullMQ targets it.
**Instead of** _node-redis_ — comparable; ioredis is what BullMQ targets, so using both means one
connection library. _Upstash HTTP client_ — vendor-specific.
**Health** Stable and ubiquitous. v6 adds RESP3 and fixes a cluster `MOVED` prototype-pollution path.
**Exit** Low — behind `@repo/cache`.
**Version note:** coupled to BullMQ. Until BullMQ 6, ioredis was a hard `dependencies` pin inside
BullMQ, so the two cannot be upgraded independently — Renovate groups them for that reason. See
[ADR-0010](../adr/0010-bullmq-6-pluggable-backends.md).

### BullMQ 6.2

**Why** Redis-backed queues with retries, backoff, rate limiting, job schedulers, flows, and
priorities. Redis is already present for caching, so the marginal infrastructure cost is zero.
**Instead of** _pg-boss_ — Postgres-backed, one less service, lower throughput and fewer features;
genuinely attractive if we ever want to drop Redis. _Graphile Worker_ — similar trade-off.
_Kafka / RabbitMQ_ — a broker to operate for scale we do not have. _Inngest / QStash_ — hosted, and
vendor-coupled.
**Health** The default Node queue; the maintained successor to Bull.
**Exit** Low-Medium — `@repo/core` only sees the `JobQueue` port.
**Operational note:** requires Redis `maxmemory-policy: noeviction`. An evicting Redis silently drops
jobs, which is the single most common BullMQ production failure.
**Version note:** on v6 as of 2026-08-26, for the `IQueueBackend` abstraction and because v6 is what
makes ioredis 6 adoptable. We stay on the Redis backend; the PostgreSQL backend is available but not
adopted. See [ADR-0010](../adr/0010-bullmq-6-pluggable-backends.md).

### Trigger.dev 4.5 (dropped)

**Why it was considered:** Durable execution for multi-step workflows that survive restarts and
wait for hours or days without holding a process.
**Decision:** Dropped — no durable-workflow workload has emerged, and `apps/tasks` was never
scaffolded. BullMQ alone is sufficient for the foundation; see
[ADR-0009](../adr/0009-bullmq-only-background-work.md).
**Revisit if:** Durable workflows become central — evaluate Trigger.dev, Temporal, or Inngest and
write a superseding ADR.

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
**Exit** Low — used in one worker consumer. Note it is a native module, which is why worker images
pin a base image and architecture explicitly.

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
by keeping Stripe behind the `PaymentGateway` port and never letting Stripe types into `@repo/core`.

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

### Sentry 10.69 (`@sentry/node` + `@sentry/browser`)

**Why** Error grouping, release tracking, source maps, and OTel-compatible tracing. Grouping and
deduplication are the hard part and the reason not to hand-roll this. Server processes use
`@sentry/node` via `@repo/observability`; the web client boots `@sentry/browser` only when
`NEXT_PUBLIC_SENTRY_DSN` is set.
**Instead of** _Self-hosted GlitchTip_ — a viable open-source path if data residency demands it, and
API-compatible. _Rollbar / Bugsnag_ — comparable. _Logs alone_ — no grouping, no regression detection.
**Health** The category standard; self-hostable, though heavy.
**Exit** Low-Medium — initialisation is centralised in `@repo/observability` (server) and a thin
web provider (browser).

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

### Lefthook 2.1

**Why** Single Go binary, no Node spawn per hook, parallel execution, declarative YAML, and native
staged-file globbing (so `lint-staged` is unnecessary).
**Instead of** _Husky + lint-staged_ — the incumbent; two dependencies, shell scripts, slower.
_simple-git-hooks_ — minimal, no parallelism or staged-file handling.
**Health** Stable, widely used, language-agnostic.
**Exit** Very low.

### commitlint 21

**Why** Enforces Conventional Commits, which is what makes the squashed history readable and
changelog generation possible.
**Instead of** _Convention by review_ — inconsistent within a week. _commitizen_ — an interactive
prompt, complementary rather than an alternative.
**Health** Stable, the standard.
**Exit** Very low.

### Changesets 2.31

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

### Fumadocs 16.13

**Why** Next.js-native documentation: MDX with type-safe frontmatter, generated navigation, built-in
search, and — decisively — it is a library inside _our_ Next app rather than a separate site
generator, so it shares our components, theme, and deployment.
**Instead of** _Nextra_ — similar, less flexible. _Docusaurus_ — mature and very capable, but a
separate React app with its own conventions and build. _Mintlify_ — beautiful and hosted, so
vendor-coupled. _VitePress_ — excellent, Vue-based, which we would not otherwise have.
**Health** Actively developed, growing quickly, Next-App-Router-first.
**Exit** Low-Medium — content is plain MDX, so it is portable; navigation and components would be
rebuilt.

### Scalar (`@scalar/nextjs-api-reference` 0.11)

**Why** Renders an OpenAPI document as an interactive reference with a built-in request client. Modern
and fast, and it consumes the spec we already generate.
**Instead of** _Swagger UI_ — the incumbent, dated. _Redoc_ — good static reference, no request client;
the paid tier holds the interesting features. _Hand-written API docs_ — always wrong within a month,
which is why the spec is generated in the first place.
**Health** Active open-source project with commercial backing.
**Exit** Very low — it consumes a standard OpenAPI document, so swapping renderers is trivial. This
is the payoff of treating the spec as the contract.

### Mermaid

**Why** Diagrams as text: reviewable in PRs, diffable, no binary assets, and rendered natively by
GitHub and Fumadocs. An architecture diagram in a proprietary tool is stale within a quarter.
**Instead of** _Excalidraw / Figma_ — better for exploratory sketching, not for versioned truth.
_PlantUML_ — needs Java. _D2_ — nicer output, needs a binary and lacks native GitHub rendering.
**Health** Ubiquitous.
**Exit** Very low.

---

## 8. Rejected dependencies

Things a repo like this often includes, and why this one does not.

| Rejected                                       | Why                                                                                                                                                                                                                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ESLint + Prettier**                          | ESLint's type-aware path is blocked on TypeScript 7 (typescript-eslint: "not planned"); Oxlint + Oxfmt are 30–100× faster and cover both.                                                                                                                                         |
| **neverthrow / fp-ts**                         | `Result` types are viral across every layer; exceptions plus typed errors mapped at the boundary give us the same guarantees where they matter, with readable orchestration code.                                                                                                 |
| **`@t3-oss/env-nextjs`**                       | ~80 lines of Zod, and we need per-app schema composition and custom cross-field rules anyway.                                                                                                                                                                                     |
| **clsx + tailwind-merge as separate concerns** | Both are needed, but exposed only through a single `cn()` in `@repo/ui`, so call sites depend on our helper, not the libraries.                                                                                                                                                   |
| **A DI container (tsyringe, TypeDI)**          | Plain function composition gives the same testability without decorators, `reflect-metadata`, or startup-order magic.                                                                                                                                                             |
| **GraphQL (Apollo, Pothos, urql)**             | We control the only internal consumer (tRPC is better there) and third parties want REST. GraphQL adds a schema, resolvers, N+1 concerns, and a client cache for no gain here.                                                                                                    |
| **Prisma**                                     | Considered seriously; rejected for the Rust engine binary, a separate schema language, and generated-client friction in a monorepo.                                                                                                                                               |
| **Redux Toolkit**                              | Our client state is small; Zustand covers it without the ceremony.                                                                                                                                                                                                                |
| **Storybook**                                  | Genuinely useful, and genuinely heavy: a second build system, a second dependency graph, and constant maintenance. Component tests plus a route in `apps/web` that renders the design system cover our needs at a fraction of the cost. Revisit if a dedicated design team joins. |
| **Kubernetes**                                 | A control plane to operate, upgrade, and secure for orchestration a Compose file already provides at this scale. Images are standard OCI, so the door stays open.                                                                                                                 |
| **Terraform**                                  | OpenTofu is the MIT-licensed, neutrally-governed continuation.                                                                                                                                                                                                                    |
| **Husky + lint-staged**                        | Lefthook does both, faster, as one binary.                                                                                                                                                                                                                                        |
| **semantic-release**                           | Changesets makes release intent explicit and reviewable in a monorepo.                                                                                                                                                                                                            |
| **Lodash**                                     | Modern JavaScript covers nearly all of it; the handful we want lives in `@repo/utils`.                                                                                                                                                                                            |
| **Axios**                                      | Native `fetch` is universal in Node 24 and the browser.                                                                                                                                                                                                                           |
| **Moment.js**                                  | Deprecated by its own maintainers.                                                                                                                                                                                                                                                |
| **A separate feature-flag vendor**             | PostHog provides flags, and our interface makes the provider swappable.                                                                                                                                                                                                           |
| **A separate cron service**                    | BullMQ job schedulers cover scheduled work.                                                                                                                                                                                                                                       |
| **`uuid`**                                     | Postgres 18 has native `uuidv7()`; the application-side generator is a few lines using `node:crypto`.                                                                                                                                                                             |
| **A logging SaaS SDK**                         | Pino writes JSON to stdout; shipping is the platform's job, which keeps the aggregator swappable.                                                                                                                                                                                 |

---

## 9. Risk register

The dependencies that need active watching, with the trigger that would make us act. This section
exists because the honest answer to "is this stack safe" is "mostly, and here is precisely where it
is not".

| #   | Risk                                                                                                                                                               | Severity   | Assessment & mitigation                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **TypeScript 7 has no stable programmatic API until 7.1** (~Q4 2026). typescript-eslint declined TS 7 support; Volar-based template checking cannot run on it.     | High       | Our toolchain is chosen to be unaffected: Oxlint's type-aware backend is built on `typescript-go` directly, and we use no Vue/Svelte/Astro template checking. `@typescript/typescript6` provides `tsc6` for any tool that needs the old API. **Trigger to revisit:** a tool we depend on turns out to embed the compiler. |
| R2  | **Oxfmt is pre-1.0 (0.61.0)** with weekly releases and no Prettier-plugin support.                                                                                 | Low        | It passes 100 % of Prettier's JS/TS conformance tests, and a formatter is the single most replaceable tool in any repo — worst case is one reformat commit back to Prettier. Version pinned exactly; upgrades are their own PR so a formatting-diff commit is never mixed with logic.                                     |
| R3  | **`oxlint-tsgolint` is version-locked to a specific TypeScript release.**                                                                                          | Medium     | Renovate groups `typescript` and `oxlint-tsgolint` so they move together. If tsgolint lags a TypeScript release, we hold both back — a typecheck and a linter that disagree about the language is worse than being one patch behind.                                                                                      |
| R4  | **Drizzle v1 has been in beta/RC for ~a year**; `latest` is still 0.45.2.                                                                                          | Medium     | Q1 in the [index](./README.md#7-open-questions-requiring-your-decision). Whichever way it is decided, queries are confined to `*.repository.ts`, and the migration-folder format change is far cheaper before production migrations exist. Tracked as a scheduled task with an ADR either way.                            |
| R5  | **Base UI stabilised recently** (1.6.0) and was **renamed** from `@base-ui-components/react`.                                                                      | Low-Medium | It is now shadcn/ui's default with 6M+ weekly downloads, and an official Radix↔Base migration skill exists in both directions. shadcn components live in our repo, so we can patch them ourselves.                                                                                                                        |
| R6  | **TanStack Table v9 is in beta.**                                                                                                                                  | Low        | Stay on stable v8; v9 is evaluated when it ships. Confined to `@repo/ui/table`.                                                                                                                                                                                                                                           |
| R7  | **Better Auth moves fast** (1.6.25, with 1.7 in RC).                                                                                                               | Medium     | Pin exactly, read changelogs, and treat minor upgrades as reviewed PRs with the auth E2E suite as the gate. Auth tables are ours, so a bad release is a hold, not an outage.                                                                                                                                              |
| R8  | **Next.js majors are disruptive** (the 15→16 `middleware`→`proxy` rename is the current example, and `middleware.ts` still compiles while silently doing nothing). | Medium     | Business logic is outside `apps/web`, so a Next migration is one app. Majors get a dedicated PR, the official codemods, and an explicit check that deprecated file conventions are actually gone.                                                                                                                         |
| R9  | **Durable workflows may need a platform later** (dunning, multi-day sequences). BullMQ cannot checkpoint waits.                                                    | Low        | No current workload; revisit per [ADR-0009](../adr/0009-bullmq-only-background-work.md) if durable execution becomes central.                                                                                                                                                                                             |
| R10 | **Zod is used everywhere** — contracts, env, forms, API, jobs.                                                                                                     | Medium     | Accepted deliberately. A migration would be large but mechanical, and the alternative (a weaker validation abstraction) is worse in the place we depend on most.                                                                                                                                                          |
| R11 | **Vendor concentration**: Cloudflare provides DNS, CDN, WAF, and object storage.                                                                                   | Medium     | Each is individually replaceable (S3 API for storage, any DNS provider, any CDN), and none is imported in application code. Documented as a known concentration rather than pretended away.                                                                                                                               |
| R12 | **Sharp is a native module.**                                                                                                                                      | Low        | Worker base image and architecture are pinned; multi-arch images are built and tested.                                                                                                                                                                                                                                    |
| R13 | **Supply-chain compromise of any dependency.**                                                                                                                     | High       | Renovate enforces a 3-day minimum release age for non-security updates, lockfiles are committed and frozen in CI, `pnpm audit` and CodeQL run in CI, Trivy scans images, action SHAs are pinned, and provenance attestations are generated.                                                                               |

### Review cadence

This document is reviewed **quarterly**, and immediately whenever: a dependency is added or removed,
a risk-register trigger fires, a major version of a load-bearing dependency ships, or a security
advisory affects us. The review asks one question per entry — _would we still choose this today?_ —
and records the answer.
