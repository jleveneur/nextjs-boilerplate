# AGENTS.md

Instructions for AI coding agents working in this repository. Humans should read
[`docs/architecture/`](docs/architecture/README.md) instead — this file is a
condensed set of rules, not an explanation of why they exist.

Read this before writing code. When something here conflicts with a pattern you
see in the codebase, the codebase is probably mid-migration: follow this file and
say so.

---

## 1. Before you finish

Run the fast local gate before reporting work complete:

```bash
make check
```

It runs formatting, type-aware lint, typechecking, layer, flag-expiry, and env-catalog checks,
spelling, dead-code detection, React Doctor, script tests, unit tests, and the web bundle
budget. A green result is necessary, but does not predict that full CI will pass.
CI runs overlapping checks in parallel (using affected typechecks and unit tests
on PRs) and adds history- and service-dependent gates: secret and commit scans,
changesets, OpenAPI drift, container builds and scans, integration tests,
Playwright, Lighthouse, and CodeQL.

Use the relevant Make targets when reproducing those CI paths locally:
`make openapi-check`, `make images`, `make test-integration`, `make e2e`, and
`make lighthouse`. Some require Docker and `make deps-up-test`; there is
intentionally no single local command that reproduces all CI policy and hosted
runner checks.

If a failure looks pre-existing, confirm that on a clean tree instead of
assuming.

Individual gates, for a faster loop: `make format`, `make lint`, `make typecheck`,
`make test`, `make layers`, `make env-catalog`, `make spell`, `make knip`,
`make react-doctor`.

---

## 2. The rule that matters most: layer boundaries

Packages may depend **only on strictly lower layers**. Same-layer and upward
dependencies are both banned, which is what keeps the graph acyclic by
construction. Enforced by `make layers` (see
[ADR-0002](docs/adr/0002-layered-monorepo-with-pnpm-enforcement.md)).

| Layer     | Contains                                     | May import                |
| --------- | -------------------------------------------- | ------------------------- |
| 0         | Pure utilities, types, config schemas        | Nothing internal          |
| 1         | Infrastructure adapters (db, storage, email) | Layer 0                   |
| 2         | Domain and application logic                 | Layers 0–1                |
| 3         | Transport (oRPC procedures, REST handlers)   | Layers 0–2                |
| 4         | Apps (deployable units)                      | Layers 0–3, `ui`          |
| `ui`      | Design system                                | Layer 0 only              |
| `tooling` | Build and lint configuration                 | Never imported at runtime |

Every package declares its own layer in `package.json`:

```json
{ "name": "@repo/core", "repo": { "layer": 2, "runtime": "node" } }
```

`runtime` is `browser`, `node`, or `build`. A `browser` package may not depend on
a `node` package — that is the path by which a secret reaches a client bundle.

**When two packages in the same layer seem to need each other**, do not add the
dependency — **except inside layer 0**, where foundation packages may form a
small DAG (`errors → types`, `contracts → types + utils`). From layer 1 up: move
the shared piece down a layer, let a higher layer orchestrate both, or inject a
function. If you cannot see which applies, stop and ask.

---

## 3. Where logic goes

Business logic lives in the domain/application layer and nowhere else. Transports
translate; they do not decide.

- **No database queries in an oRPC procedure, route handler, or Server Action.**
  Call an application service.
- **No business rules in a React component.** Components render state and raise
  events.
- **Repositories** contain queries, not policy.

Every application service:

1. Takes an explicit **actor** (who is doing this) — never reads ambient session
   state.
2. **Authorizes first**, before any read or write.
3. **Scopes every query by `organization_id`.** A query without tenant scoping is
   a data leak, not a bug.
4. Returns typed results, and throws typed `AppError` subclasses for failures.

---

## 4. Non-negotiables

These fail CI, so there is no version of "just for now":

- **No `any`.** Use `unknown` and narrow. No non-null assertions (`!`).
- **No `console`.** Use `@repo/logger`. Scripts and composition roots are the
  documented exceptions.
- **No unawaited promises.** A floating promise in a request handler is silent
  data loss.
- **No secrets in code, tests, fixtures, or commit messages.** Gitleaks blocks
  commits and CI scans history.
- **No ad hoc `process.env` reads in libraries.** Composition-root env modules
  select runtime values and pass them to `createEnv`; process-edge entry points
  and tests/tooling may read only their own boundary metadata or controls.
- **Validate every external input with Zod** at the boundary — request bodies,
  webhook payloads, environment, third-party responses.
- **Money is an integer in minor units.** Never a float.
- **IDs are UUIDv7** and branded types, so an `OrganizationId` cannot be passed
  where a `UserId` belongs.

---

## 5. Conventions

- Files and directories: `kebab-case`. Types and components: `PascalCase`.
  Functions and variables: `camelCase`. Constants: `SCREAMING_SNAKE_CASE`.
- Tests sit beside the code as `*.test.ts`.
- Import internal packages by name (`@repo/db`), never by relative path across a
  package boundary.
- Type-only imports use `import type`.
- Database columns are `snake_case`; public JSON is `snake_case`; TypeScript is
  `camelCase`. The mapping is explicit, at the edge.
- React Server Components by default; `"use client"` only where interactivity
  requires it.

Full detail: [`docs/architecture/04-conventions.md`](docs/architecture/04-conventions.md).

---

## 6. Adding a dependency

The bar is high and deliberate. Before adding one:

1. Check it is not already solved by something in the workspace.
2. Add it to the package that uses it — never to the root, and never to a package
   that merely re-exports it.
3. Use `catalog:` for anything shared by more than one package, and add the
   version to `pnpm-workspace.yaml`.
4. Pin exact versions. No ranges.

If the dependency is load-bearing — a framework, an ORM, an auth library — it
needs an entry in
[`docs/architecture/13-dependency-review.md`](docs/architecture/13-dependency-review.md)
covering why it wins over the alternatives and what leaving it would cost. If you
cannot write that paragraph, do not add it.

---

## 7. When a decision is architectural

Write an ADR in `docs/adr/` using the existing numbering and format if the change
affects: the package graph, a transport, the data model's shape, auth or
authorization, deployment topology, or a load-bearing dependency.

Update the architecture docs **in the same change** as the code. A convention
documented in one place and implemented differently in another is worse than no
documentation, because it makes the docs untrustworthy.

---

## 8. Commits and pull requests

- [Conventional Commits](https://www.conventionalcommits.org), enforced by
  commitlint: `feat(scope): summary`, `fix(db): ...`, `chore(deps): ...`.
- The PR title becomes the squashed commit message.
- Run `pnpm changeset` when a `packages/*` public API changes. Not for app-only
  changes, docs, or tooling.

---

## 9. Working style

- **Prefer editing over adding.** A new file that overlaps an existing one is a
  future inconsistency.
- **Do not create documentation files** unless asked. This repo has a documented
  structure; a stray `NOTES.md` does not fit it.
- **Do not weaken a check to make it pass.** Disabling a lint rule, loosening a
  type, adding an ignore entry, or skipping a test is a change that needs its own
  justification and review. Fix the cause.
- **Verify claims about behaviour by running something.** Reading code is a
  hypothesis; the test result is evidence.
- **Say what you are unsure about.** An unflagged guess about a boundary costs
  more to find later than a question costs now.
