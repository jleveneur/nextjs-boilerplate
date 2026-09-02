# Architecture Decision Records

An ADR records **one decision**: the context that forced it, the options considered, what was
chosen, and the consequences accepted. It captures the reasoning that is invisible in the diff.

The [architecture documents](../architecture/README.md) describe the system as it is _now_. ADRs
describe _why_ it became that way, and are append-only. When the present changes, write a new ADR
superseding the old one and update the architecture document — never rewrite history.

---

## Why ADRs, specifically

Six months after a decision, the reasoning is gone. What remains is code that looks arbitrary, and
the two failure modes that follow: someone "fixes" a deliberate constraint, or someone preserves an
accidental one forever because they assume it was deliberate.

An ADR costs fifteen minutes and answers three questions that otherwise cannot be answered:

1. Was this considered, or did nobody think about it?
2. What would have to change for this to be reconsidered?
3. What did we knowingly give up?

The third is the most valuable. A decision without stated costs is marketing.

---

## When to write one

Write an ADR when a decision is **expensive to reverse** or **surprising without explanation**:

- Adding, replacing, or removing a load-bearing dependency
- Changing the layering, boundaries, or package graph
- Anything touching authentication, authorization, or multi-tenancy
- Data-model decisions that migrations would have to undo
- API contract or versioning policy
- Deployment topology or infrastructure strategy
- Deliberately _rejecting_ a common practice (these are the most useful ADRs of all)

Do **not** write one for: routine dependency upgrades, refactors with no external consequence, or
anything already covered by an existing ADR.

## Format

MADR-lite. One file per decision: `NNNN-kebab-case-title.md`, numbered sequentially, never renumbered.

```markdown
# NNNN — Title (a decision, not a topic)

- **Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
- **Date:** YYYY-MM-DD
- **Deciders:** who
- **Supersedes / Superseded by:** links, if any

## Context

The forces at play. What makes a decision necessary now. Constraints and requirements.

## Options considered

Each with its genuine advantages, not a straw man. If an option had no merit, it was not an option.

## Decision

What we chose, stated plainly, and the reasoning that made it win.

## Consequences

**Positive** — what this buys.
**Negative** — what this costs. Mandatory. An ADR with no negative consequences is not honest.
**Neutral** — what changes without being better or worse.

## Revisit if

The concrete trigger that should make a future reader reopen this. Optional but valuable.
```

Statuses: **Proposed** (under discussion), **Accepted** (in effect), **Deprecated** (no longer
relevant, not replaced), **Superseded** (replaced — links forward to the replacement).

---

## Index

| ADR                                                       | Title                                                               | Status                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| [0001](./0001-record-architecture-decisions.md)           | Record architecture decisions                                       | Accepted                                                    |
| [0002](./0002-layered-monorepo-with-pnpm-enforcement.md)  | Layered monorepo with boundaries enforced by pnpm                   | Accepted                                                    |
| [0003](./0003-one-domain-core-two-transports.md)          | One domain core behind two API transports                           | Accepted                                                    |
| [0004](./0004-native-typescript-toolchain.md)             | Adopt the native toolchain: TypeScript 7, Oxlint, Oxfmt             | Accepted                                                    |
| [0005](./0005-better-auth-with-rbac-and-policies.md)      | Better Auth with database sessions, RBAC plus record-level policies | Accepted                                                    |
| [0006](./0006-organization-scoped-multi-tenancy.md)       | Organization-scoped multi-tenancy on a shared schema                | Accepted                                                    |
| [0007](./0007-split-background-work-bullmq-triggerdev.md) | Split background work between BullMQ and Trigger.dev                | Superseded by [0009](./0009-bullmq-only-background-work.md) |
| [0008](./0008-drizzle-version-selection.md)               | Drizzle ORM version selection (0.45 vs 1.0-rc)                      | Accepted                                                    |
| [0009](./0009-bullmq-only-background-work.md)             | BullMQ-only background work                                         | Accepted                                                    |
| [0010](./0010-bullmq-6-pluggable-backends.md)             | BullMQ 6 and ioredis 6                                              | Accepted                                                    |
| [0011](./0011-orpc-private-api.md)                        | oRPC for the private API                                            | Accepted                                                    |

### Decisions recorded in the architecture documents

Not every decision warrants its own file. These are documented in place and listed here so the
decision log is complete:

| Decision                                                                      | Where                                                                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Ports only for side effects; the ORM is not abstracted                        | [03 §4](../architecture/03-package-graph-and-boundaries.md#4-ports-and-adapters--applied-narrowly)     |
| Internal packages ship TypeScript source with no build step                   | [03 §6](../architecture/03-package-graph-and-boundaries.md#6-why-not-the-alternatives)                 |
| Typed errors thrown in core and mapped at transports; `Result` types rejected | [05 §5](../architecture/05-runtime-and-api.md#5-error-handling-strategy)                               |
| Authorization never happens in `proxy.ts`                                     | [07 §1](../architecture/07-auth.md#where-session-verification-happens)                                 |
| Cursor-only pagination on the public API                                      | [05 §2.2](../architecture/05-runtime-and-api.md#22-public-api--rest--openapi)                          |
| OpenAPI generated from Zod, committed, and diffed in CI                       | [05 §2.2](../architecture/05-runtime-and-api.md#22-public-api--rest--openapi)                          |
| Forward-only migrations, applied by a job, expand/contract by default         | [06 §2](../architecture/06-data-and-storage.md#2-migration-strategy)                                   |
| Presigned direct-to-storage uploads; bytes never transit the app              | [06 §5](../architecture/06-data-and-storage.md#5-object-storage)                                       |
| Typed event registry for analytics; server capture for revenue events         | [08 §3](../architecture/08-observability.md#3-product-analytics)                                       |
| Feature flags behind our own interface, with mandatory expiry                 | [08 §4](../architecture/08-observability.md#4-feature-flags)                                           |
| Hand-rolled `@repo/env` instead of a configuration library                    | [09 §2](../architecture/09-environment-and-secrets.md#2-repoenv)                                       |
| Secrets injected at deploy; SOPS + age is an optional adopter pattern         | [09 §4](../architecture/09-environment-and-secrets.md#4-secrets-management)                            |
| Real PostgreSQL for integration tests; no mocked database                     | [10 §4](../architecture/10-testing.md#4-integration-tests)                                             |
| Docker for dependencies locally; apps run on the host                         | [11 §1](../architecture/11-infrastructure-and-deployment.md#local-development)                         |
| Traefik in compose.prod as the local reverse-proxy example                    | [11 §2](../architecture/11-infrastructure-and-deployment.md#2-reverse-proxy--traefik-v3-local-example) |
| Infrastructure-agnostic boilerplate; BYO host / IaC                           | [11 §3](../architecture/11-infrastructure-and-deployment.md#3-bring-your-own-infrastructure)           |
| Portable migrate-then-roll deploy sequence                                    | [docs/runbooks/deploy.md](../runbooks/deploy.md)                                                       |
| Trunk-based development, squash merges, linear history                        | [12 §1](../architecture/12-git-ci-release.md#1-git-workflow--trunk-based)                              |
| Changesets over semantic-release                                              | [12 §5](../architecture/12-git-ci-release.md#why-changesets-rather-than-semantic-release)              |
| Every rejected dependency, with reasoning                                     | [13 §8](../architecture/13-dependency-review.md#8-rejected-dependencies)                               |
