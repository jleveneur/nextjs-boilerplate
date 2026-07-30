# 0004 — Adopt the native toolchain: TypeScript 7, Oxlint, Oxfmt

- **Status:** Accepted
- **Date:** 2026-07-30
- **Deciders:** platform engineering
- **Related:** [13 — Dependency review](../architecture/13-dependency-review.md), risk register R1–R3

## Context

Three weeks before this decision, on **2026-07-08**, TypeScript 7.0 reached general availability: a
native Go port of the compiler and language service, roughly 8–12× faster on full builds, with
type-checking logic ported rather than rewritten so semantics are compatible with 6.0.

It shipped with one significant caveat: **no stable programmatic compiler API.** That is expected in
7.1, historically 3–4 months later (~Q4 2026). Microsoft has stated 7.1 will introduce a _new,
different_ API rather than carrying the JavaScript-based surface forward.

The ecosystem consequences were immediate and are the actual context for this decision:

- **typescript-eslint closed its TypeScript 7 support request as "not planned"** on day one.
- **ESLint core is blocked behind typescript-eslint.**
- Volar-based template checking (Vue, Svelte, Astro) cannot run on TypeScript 7 at all.

So the choice is not "which linter do we prefer". It is a forced pair: **either stay on TypeScript 6
and keep the ESLint ecosystem, or move to TypeScript 7 and use a linter that does not embed the
compiler.** Two weeks before this decision, on **2026-07-22**, the second option became viable:
Oxlint's type-aware backend (`oxlint-tsgolint`, built directly on `typescript-go`) reached **stable**
with 59 of typescript-eslint's 61 type-aware rules.

Our developer-experience targets — whole-repo typecheck under 5 seconds, lint and format under 3
seconds — are also only reachable on the native tier.

## Options considered

**TypeScript 6 + ESLint + typescript-eslint + Prettier.** The conservative, familiar choice, with the
largest plugin ecosystem and no unknowns. It means deliberately adopting a compiler that is now an
order of magnitude slower and on a maintenance track, at the start of a project intended to last
years. The migration to TypeScript 7 would still be owed, later, with more code to migrate.

**TypeScript 7 + ESLint without type-aware rules.** Keeps the plugin ecosystem and gains compiler
speed. It loses `no-floating-promises` and `no-misused-promises` — the two rules that catch
genuinely dangerous bugs (an unawaited promise in a request handler is silent data loss) and that no
syntax-only linter can detect. Rejected: those rules are most of the value of linting TypeScript.

**TypeScript 7 + Biome.** A single fast tool for linting and formatting, well-engineered, with a
coherent design. Biome's rule coverage is narrower than Oxlint's, and its type-aware story is less
advanced. A reasonable alternative that we would not regret.

**TypeScript 7 + Oxlint (+ tsgolint) + Oxfmt.** The native tier throughout: type-aware linting built
on the same `typescript-go` the compiler now uses, and a Prettier-conformant formatter that also
subsumes two plugins we would otherwise need.

## Decision

Adopt **TypeScript 7.0, Oxlint with `oxlint-tsgolint` type-aware linting, and Oxfmt.**

Supporting measures, which are what make this a defensible rather than an adventurous choice:

- **`@typescript/typescript6` is installed as an escape hatch.** It provides a `tsc6` binary
  re-exporting the TypeScript 6 API, so any tool that turns out to need the old programmatic API can
  run side by side. This makes the decision reversible in the specific way it might need to be.
- **`erasableSyntaxOnly` is enabled**, banning `enum`, namespaces, and parameter properties. Every
  file becomes type-strippable rather than requiring compilation, which is what makes source-only
  internal packages work across Next, Vitest, and Node.
- **`baseUrl` is banned** in `tsconfig.json`, because tsgolint does not support it. `paths` without
  `baseUrl` resolves relative to the config file and is fully supported, so this costs nothing beyond
  a convention.
- **`typescript` and `oxlint-tsgolint` are upgraded in lockstep**, grouped in Renovate. tsgolint is
  versioned against a specific TypeScript release (`7.0.2001` = tsgolint patch 0 for TypeScript
  7.0.2). If tsgolint lags, we hold both back — a linter and a typechecker that disagree about the
  language is worse than being a patch behind.
- **Oxfmt is pinned exactly** and upgraded in its own PR, so a whole-repo reformat diff is never
  mixed with a logic change.

Notably, this decision is _independent_ of our boundary enforcement, because
[ADR-0002](./0002-layered-monorepo-with-pnpm-enforcement.md) put that in the package manager rather
than in a lint rule. Had we chosen Nx-style ESLint boundary enforcement, this choice would have been
constrained by it. That independence was deliberate.

## Consequences

**Positive**

- Type-aware linting is retained on TypeScript 7, which the ESLint path currently cannot offer.
- Typecheck, lint, and format are fast enough to run on every save and in every hook, which changes
  how often they actually run.
- Three tools become two, and two Prettier plugins (`prettier-plugin-tailwindcss`, an import sorter)
  disappear because Oxfmt has both built in.
- CI time drops materially, which keeps PRs small.
- Oxc is used in production by Kibana, Sentry, Renovate, Preact, PostHog, and date-fns, so we are not
  first.

**Negative**

- **We leave the ESLint plugin ecosystem.** Any custom or niche rule we might have wanted must exist
  in Oxlint or not exist. This is the real cost of this decision and should not be understated.
- **Oxfmt is pre-1.0 (0.61.0)** with weekly releases and no Prettier-plugin support. Mitigated by its
  100 % pass rate on Prettier's JS/TS conformance tests, and by a formatter being the most
  replaceable tool in any repository.
- Two of 61 type-aware rules are not yet implemented.
- A version-coupling constraint between `typescript` and `oxlint-tsgolint` that Renovate must respect
  and a human must understand.
- Adopting a GA release three weeks old carries residual risk, even with a strong validation record.

**Neutral**

- Editor setup uses the Oxc extension rather than the ESLint and Prettier extensions.
- If Oxlint disappoints, `eslint-plugin-oxlint` and `@oxlint/migrate` exist for the return journey —
  though that journey would also require reverting to TypeScript 6.

## Revisit if

TypeScript 7.1 ships its stable API and typescript-eslint reverses its position (which would restore
the ESLint option without requiring a compiler downgrade); or if Oxfmt reaches 1.0 (removing R2); or
if a rule we genuinely need proves absent from Oxlint with no path to being added.
