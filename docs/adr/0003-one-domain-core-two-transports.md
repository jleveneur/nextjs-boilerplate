# 0003 — One domain core behind two API transports

- **Status:** Accepted
- **Date:** 2026-07-30
- **Deciders:** platform engineering
- **Related:** [05 — Runtime architecture & API strategy](../architecture/05-runtime-and-api.md)
- **Amended by:** [0011 — oRPC for the private API](./0011-orpc-private-api.md) (private transport
  library only; the one-core-two-transports rule is unchanged)

## Context

Two API surfaces are required, and they have genuinely different requirements:

- A **private API** for our own web client, where the client and server ship together. Here a
  compile-time contract is strictly better than a runtime one, and breaking changes are free.
- A **public API** for third parties, which needs versioning, an OpenAPI document, ordinary HTTP
  semantics, generated SDKs, and stability measured in years.

Beyond those, the same business rules will also be reached by background job consumers, inbound
webhooks, and Server Actions — five entry points in total.

The failure mode this decision exists to prevent is the most common one in products that add a public
API to an existing app: **the rules get implemented twice.** The web path validates a state
transition one way, the public endpoint another, and they drift. Six months later a customer can do
something through the API that the UI forbids, and nobody can say which behaviour is correct.

## Options considered

**Expose tRPC publicly.** No duplication and no extra work. But tRPC's wire format is an
implementation detail — batching, SuperJSON encoding, POST for reads — and publishing it makes
internal refactors breaking changes for customers. It also gives third parties no OpenAPI document,
no HTTP caching semantics, and no generated SDKs. Rejected: it optimises our convenience against the
consumer's needs.

**REST only, used internally too.** One surface, honest and simple. It costs the end-to-end type
safety that makes internal development fast, or reintroduces it via a codegen step with a drift
window. Rejected: we would be giving up the private API's main advantage to solve a problem that
layering already solves.

**GraphQL for both.** A single schema serving both audiences, with field-level evolution instead of
versioning. It brings resolvers, N+1 concerns, query-complexity limits, and a client cache — real
cost for a benefit we do not need, since we control the only internal consumer and third parties
overwhelmingly expect REST. Rejected as disproportionate.

**Two independent implementations.** Each surface owns its logic, optimised for its consumer. This is
what happens by accident when nobody decides, and it is the outcome this ADR exists to prevent.

**One domain core, with transports on top.** Business logic lives in one place; each surface is a
thin adapter that translates between its wire format and that core.

## Decision

**All business logic lives in `@repo/core`, organised by feature, and knows nothing about HTTP, tRPC,
React, or Next.js.** Every entry point is a _transport_ whose job is exactly four steps: parse input,
resolve the actor, call one core service, map the result and errors to its wire format.

Concretely:

- **Private API** — tRPC 11, in `@repo/trpc`, mounted in `apps/web`. Layered procedures
  (`public` / `protected` / `org`) make authentication and tenant scoping structural rather than
  remembered.
- **Public API** — Hono + `@hono/zod-openapi` in `apps/api`, versioned at `/v1`, with the OpenAPI 3.1
  document **generated from the same Zod schemas that validate requests**. There is no second source
  of truth, so the spec cannot drift from the implementation.
- **Shared vocabulary** — `@repo/contracts` holds the Zod schemas and DTOs both surfaces use, and is
  the only package importable by both the browser and every server surface.
- **Shared actor** — an API key and a session cookie both resolve to the same `Actor` value object.
  This is the detail that matters most for security: `@repo/core` **cannot tell** whether it is
  serving the web app or a third party, and therefore cannot apply weaker rules to one of them.

Transport-level rules: resolvers stay under roughly fifteen lines; output schemas are mandatory (they
are what stops an internal column from entering an API response); and services return DTOs, never raw
database rows.

## Consequences

**Positive**

- A business rule exists once. The web app, the public API, a webhook, a job, and a Server Action
  cannot disagree.
- Each surface gets the technology suited to its consumer, with no compromise between them.
- The marginal cost of a second transport is small — a route file — which makes "should we expose
  this publicly?" a product question rather than an engineering project.
- Core is testable without HTTP, React, or a running server, which is why the unit suite is fast.
- Replacing Next.js or Hono becomes a transport-layer job rather than a rewrite.

**Negative**

- One extra indirection: a simple read passes through a service instead of querying inline. For
  genuinely trivial endpoints this feels like ceremony, and it is.
- Two transport technologies to know, version, and upgrade.
- Casing differs between surfaces (`camelCase` internally, `snake_case` publicly), so a mapping layer
  exists and must be maintained.
- Discipline is required: the temptation to put "just one query" in a resolver never goes away, and
  this is the boundary reviewers must actively police.

**Neutral**

- `openapi.json` is a committed, CI-diffed artifact, which adds a step to API changes and makes
  breaking changes visible in review.
- Server Actions are permitted only for progressive-enhancement forms, keeping the transport list
  bounded at five.

## Revisit if

A second first-party client (mobile, CLI) needs a stable contract, in which case it may be better
served by the public REST surface than by tRPC — or if third-party demand for GraphQL becomes real
rather than theoretical.
