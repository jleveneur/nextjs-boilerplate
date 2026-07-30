# 0002 — Layered monorepo with boundaries enforced by pnpm

- **Status:** Accepted
- **Date:** 2026-07-30
- **Deciders:** platform engineering
- **Related:** [03 — Package graph & boundaries](../architecture/03-package-graph-and-boundaries.md)

## Context

The repository will hold a Next.js application, a public REST API, background workers, a docs site,
and the shared code behind them. Over years, the dominant risk is not missing features — it is
**erosion**: business logic drifting into React components, database queries appearing in route
handlers, and the UI package quietly importing server code until nothing can be moved or tested in
isolation.

Every codebase claims to have layers. What separates the ones that keep them is whether violating a
layer is _inconvenient_ or _impossible_. Documentation and code review reliably fail here, because a
boundary violation looks like an ordinary import statement on line 4 of a 300-line diff.

The requirement is therefore an enforcement mechanism that does not depend on anyone remembering.

## Options considered

**One Next.js app with `src/lib`.** Simplest, fastest to start, and adequate for a single small
product. It provides no enforceable boundary at all: everything can import everything. It also makes
the public API a copy of internal logic and makes deploying workers separately impossible without
restructuring. Rejected on the primary requirement.

**Monorepo with documented conventions only.** Packages exist, layering is written down, reviewers
are asked to check it. This is the common approach and it decays predictably — the boundary holds
until the first urgent deadline.

**Monorepo with lint-rule enforcement (Nx module boundaries, or `eslint-plugin-boundaries`).** Real
enforcement, and Nx's implementation is good. Two objections: a lint rule can be disabled inline by
anyone in a hurry, and — decisively in 2026 — ESLint's type-aware path is blocked behind
typescript-eslint's decision not to support TypeScript 7, so building enforcement on ESLint means
constraining the compiler choice. Nx additionally brings executors, generators, and plugins that are
genuine lock-in we have no need for.

**Monorepo with a dependency-graph checker (`dependency-cruiser`).** Effective and configurable. It
is another dependency and another config to maintain, and it runs after the fact rather than
preventing the import.

**Layered monorepo where boundaries are enforced by the package manager.** pnpm's isolated
`node_modules` gives each package only its declared dependencies. An undeclared import does not
resolve — in the editor, in the typechecker, and in the build.

## Decision

We use **Turborepo + pnpm workspaces**, with every package assigned to a **numbered layer** and one
rule: **a package may depend only on strictly lower layers.** Same-layer dependencies are banned,
which guarantees the graph is acyclic by construction rather than by inspection.

Enforcement is layered, strongest first:

1. **pnpm isolated `node_modules`** — an undeclared import is physically unresolvable. This is the
   primary mechanism, and its most useful property is that **violating a boundary requires editing a
   `package.json`**, which is a visible, reviewable, `CODEOWNERS`-gateable diff rather than a hidden
   import line.
2. **`exports` maps** with no wildcards into `src`, so internals cannot be deep-imported.
3. **`server-only` imports** in server packages, so a client component pulling in server code fails
   the build instead of leaking secrets.
4. **CI checks** — cycle detection, a layer assertion over every manifest, `turbo boundaries`, Knip
   for undeclared dependencies, and a browser-safety test.

`.npmrc` therefore pins `node-linker=isolated`, `shamefully-hoist=false`, and
`auto-install-peers=false`. These are not tuning preferences; they are the architecture.

The banning of same-layer dependencies deserves its own note, since it is the unusual part. It
applies from layer 1 up. Layer 0 is the exception: foundation packages may form a small DAG among
themselves (`errors → types`, `contracts → types + utils`), with cycles still rejected. Inventing a
layer below 0 just to hold `types` would add ceremony without adding safety.

When two layer-1 adapters appear to need each other, the answer is always to move the shared piece
down a layer or to let layer 2 orchestrate both. The concrete case we hit immediately: `@repo/db`
wanting `@repo/logger`. Resolved by **injecting a function rather than importing a package** — the
composition root passes a `logQuery` callback. This keeps `@repo/db` usable in migration scripts and
tests with no logging stack attached, which is a real benefit rather than a rule-following exercise.

## Consequences

**Positive**

- Boundary violations are prevented, not detected. There is no inline escape hatch.
- The dependency graph is reviewable as a diff.
- Enforcement is independent of the linter, so the toolchain choice in
  [ADR-0004](./0004-native-typescript-toolchain.md) is unconstrained by it.
- Packages are independently testable, and workers deploy without the web app.
- `turbo prune` produces minimal Docker contexts as a direct consequence of accurate manifests.

**Negative**

- More `package.json` files to maintain, and adding a legitimate cross-package dependency takes a
  deliberate step rather than an autocomplete.
- The layer rule is occasionally genuinely inconvenient (the `db` → `logger` case), forcing an
  injection pattern that is slightly more code than an import.
- pnpm's strictness surfaces broken third-party packages that rely on hoisting. This is correct
  behaviour that occasionally looks like a pnpm bug and costs debugging time.
- Onboarding requires understanding the layer model before adding code.

**Neutral**

- Roughly twenty packages. The count looks high; each is small and single-purpose.
- Turborepo is replaceable at low cost — it orchestrates scripts. pnpm is not, because the boundary
  guarantee would be lost. This asymmetry is deliberate and should be understood before anyone
  proposes switching package managers.

## Revisit if

pnpm changes its default linking strategy, or a Node-native mechanism (import maps with real
enforcement) makes package-manager-level isolation unnecessary.
