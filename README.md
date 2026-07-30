# Application foundation

A production-grade monorepo foundation: typed end to end, self-hostable, and
cloud-agnostic. Built to be the starting point for real products rather than a
demo.

**Status:** under construction. The architecture is settled and documented; the
implementation is landing in reviewable phases. See
[the implementation plan](docs/architecture/14-implementation-plan.md) for what
exists today and what is next.

---

## Quick start

Requires [Node.js](https://nodejs.org) 24+, [pnpm](https://pnpm.io) 11+, and
[Docker](https://docs.docker.com/get-docker/). `make help` lists everything.

```bash
pnpm install     # dependencies and Git hooks
make check       # every quality gate — the same set CI runs
```

---

## What this is

An opinionated foundation where the opinions are written down. Every significant
choice has a rationale, a list of rejected alternatives, and a note on what
replacing it would cost — because the expensive part of a long-lived codebase is
not making decisions, it is rediscovering why they were made.

The load-bearing ideas:

- **Boundaries are enforced, not encouraged.** Packages sit in layers and may only
  depend downward. pnpm's isolated `node_modules` makes an undeclared import
  physically unresolvable, and `make layers` rejects a declared dependency that
  breaks the layering. An architecture rule that only exists in a document is a
  rule that erodes.
- **One domain core, two transports.** Business logic lives in one place; tRPC
  serves the app and REST/OpenAPI serves third parties. Neither transport owns a
  rule the other would have to duplicate.
- **Multi-tenant from the first migration.** Tenancy is not something a schema
  grows later without a rewrite.
- **Self-hostable by default.** Docker, OpenTofu, and Ansible, with no managed
  service on the critical path that lacks a documented exit.

---

## Documentation

| Read this                                                                        | For                                                 |
| -------------------------------------------------------------------------------- | --------------------------------------------------- |
| [Architecture overview](docs/architecture/README.md)                             | The whole design, in reading order                  |
| [Principles and constraints](docs/architecture/01-principles-and-constraints.md) | What is optimised for, and what is deliberately not |
| [Repository topology](docs/architecture/02-repository-topology.md)               | What lives where                                    |
| [Package graph](docs/architecture/03-package-graph-and-boundaries.md)            | The layer rule and how it is enforced               |
| [Conventions](docs/architecture/04-conventions.md)                               | Naming, TypeScript settings, patterns               |
| [Dependency review](docs/architecture/13-dependency-review.md)                   | Why each dependency is here, and what replaces it   |
| [ADRs](docs/adr/README.md)                                                       | Decisions, with their alternatives and consequences |
| [AGENTS.md](AGENTS.md)                                                           | Rules for AI coding agents                          |

---

## Layout

```
apps/        Deployable units (web, api, workers)
packages/    Shared libraries, arranged in layers
tooling/     Build, lint, and type configuration
docker/      Images and Compose stacks
infra/       OpenTofu and Ansible
docs/        Architecture and ADRs
scripts/     Repository automation, with its own tests
```

---

## Working here

```bash
make check       # everything below, in one command
make lint        # oxlint, including type-aware rules
make typecheck   # tsc --noEmit across the workspace
make test        # unit tests
make layers      # assert the layer boundaries hold
make format      # apply Oxfmt
```

Git hooks run a fast subset before each commit and push. They are a convenience —
CI is the gate — so `make check` before pushing is the habit that matters.

Commits follow [Conventional Commits](https://www.conventionalcommits.org).
Changes to a `packages/*` public API need a changeset (`pnpm changeset`).

---

## Toolchain notes

Two choices will surprise people, so they are called out here:

- **TypeScript 7** is the native (Go) compiler. It ships a platform binary and no
  `tsserver.js`, so editors need the TypeScript 7 language server to match what
  CI checks. `.vscode/` is configured for this; see
  [ADR-0004](docs/adr/0004-native-typescript-toolchain.md).
- **Oxlint and Oxfmt** replace ESLint and Prettier, primarily because the ESLint
  type-aware ecosystem does not support TypeScript 7's API. The trade-offs and the
  exit path are in the same ADR.
