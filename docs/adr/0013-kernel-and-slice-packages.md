# 0013 — A kernel package plus one package per domain slice

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** platform engineering
- **Related:** [0002 — Layered monorepo with boundaries enforced by pnpm](./0002-layered-monorepo-with-pnpm-enforcement.md),
  [03 — Package graph and boundaries](../architecture/03-package-graph-and-boundaries.md)

## Context

`@repo/core` was one layer-2 package holding two different kinds of thing:

- a **kernel** — the request context (`Ctx`), the side-effect ports, the audit log writer, and the
  transactional outbox; and
- three **domain slices** — `billing/`, `subscription/`, and `assets/`.

The slices were already independent: none of them imported another, in source or in tests. But that
property held by discipline alone. [03
§5](../architecture/03-package-graph-and-boundaries.md) claimed cross-feature deep imports were
"enforced by `@repo/core`'s internal lint config restricting deep relative imports across feature
folders." **No such config existed.** `packages/core` had no lint file, and the repo's only
`no-restricted-imports` rule was scoped to the Next apps. Nothing stopped `billing/` from reaching
into `assets/asset.repository.ts`.

A boundary documented as enforced but not enforced is worse than an unenforced one, because
reviewers stop looking for the violation.

Separately, the same-layer ban made the obvious fix awkward. Three peer layer-2 packages cannot share
a layer-2 kernel, and the kernel cannot drop to layer 1 because `ctx.ts` depends on `@repo/db`
(layer 1) for `Database` and `DbTransaction`. There was no free slot between 2 and 3.

## Options considered

**Keep one package, add subpath exports** (`@repo/core/billing`, `/assets`, …). About five lines of
`exports` plus repointing the import sites. No layer change, no new package boilerplate, and
`example-inventory` already deletes slices by path so feature-deletability was unaffected. What it
does not buy is _structural_ prevention of a cross-slice import — the property actually wanted — nor
independent coverage floors. It would have meant writing the lint rule the docs already promised, and
trusting a rule rather than the module graph.

**Keep one package, write the missing lint rule.** A `packages/core/**`
`no-restricted-imports` override, roughly ten lines, closing the documented-but-absent gap at the
lowest possible cost. Genuinely the cheapest honest option. Rejected because a lint rule is a
convention with a check bolted on, where a package boundary is enforced by pnpm's isolated
`node_modules` — an undeclared import is not lint-clean-but-wrong, it is unresolvable.

**Kernel and slices both at layer 2, with a `repo.sharedKernel` exception in `check-layers.ts`.**
Cheapest mechanically: no renumber, about fifteen lines in the checker. Rejected on doctrine. It
directly contradicts ADR-0002 ("same-layer dependencies are banned… applies from layer 1 up. Layer 0
is the exception") and trips AGENTS.md §9, "do not weaken a check to make it pass." It also sets the
precedent that any package can claim kernel status.

**Renumber to open a layer.** Kernel stays at 2, slices go to 3, transport moves 3→4, apps 4→5.
Preserves "strictly lower layers only" with no exception at all.

## Decision

**Split `@repo/core` into `@repo/kernel` at layer 2 and one package per slice at layer 3, and
renumber transport to 4 and apps to 5 to open layer 3.**

| Package              | Layer | Contents                                                   |
| -------------------- | ----- | ---------------------------------------------------------- |
| `@repo/kernel`       | 2     | `ctx.ts`, ports, audit log, outbox, in-memory test doubles |
| `@repo/billing`      | 3     | Invoices and the void policy                               |
| `@repo/subscription` | 3     | Stripe checkout, entitlements, subscription state          |
| `@repo/assets`       | 3     | Presigned uploads, confirmation, image derivatives         |

The renumber cost one constant (`APP_LAYER` in `scripts/check-layers.ts`), two manifests, four test
cases, and the layer table in three documents. `parseLayer` already accepted any integer.

Slices must live at `packages/<name>`, flat. `check-layers.ts` globs
`{apps,packages,tooling}/*/package.json` — one directory level — so `packages/slices/billing` would
be invisible to both the checker and pnpm, which is silent non-enforcement rather than an error.

One refactor was a precondition. `outbox/map-event-to-job.ts` imported `../assets/asset.events.ts`
and `../billing/billing.events.ts`: a kernel→slice edge pointing _upward_, from shared code into the
slices that depend on it. It is replaced by an `OutboxHandlers` registry that the composition root
populates, so the relay no longer names any feature.

## Consequences

**Positive**

- Cross-slice imports are now structurally impossible rather than conventionally discouraged. Two
  layer-3 peers cannot depend on each other, and pnpm makes an undeclared import unresolvable.
- The layer rule is unchanged and has no new exception. `make layers` still reports zero problems
  across the graph.
- Each slice carries its own coverage floor. This immediately surfaced that `assets` had been riding
  on core's aggregate: its only unit test covered `derive-asset-variants`, leaving `asset.events` and
  the derivation cleanup path untested. Both now have tests.
- Removing a slice is a package deletion, which is easier to reason about than a directory deletion
  plus barrel surgery.
- `@repo/storage` is now depended on by exactly one package (`@repo/assets`) instead of by all of
  core.

**Negative**

- Four packages of boilerplate where there was one: manifest, tsconfig, vitest config, server-only
  stub, barrel, and a `knip.json` entry each.
- **A slice can no longer call another slice's service.** [03
  §5](../architecture/03-package-graph-and-boundaries.md) listed that as the _preferred_ mechanism
  for cross-feature work; it is now illegal. What remains is a domain event, or moving the shared
  rule down into the kernel. This is the real cost of the decision and the thing most likely to
  chafe.
- **The kernel is not slice-agnostic.** `CtxPorts` is a closed record naming all eight ports, so the
  kernel keeps a compile-time dependency on the shape of every slice's needs: `PaymentGateway` is
  used only by `subscription`, `FileStore` only by `assets`, and `IdGenerator` gains a method per
  slice. The split stops sideways imports; it does not decouple the kernel from the slices.
- `scripts/new-slice.ts` got materially more complex — it must now scaffold a package boundary and
  register the slice in `packages/orpc`'s manifest and in `knip.json`, neither of which a slice
  needed when it was a directory.
- Layer numbers in every reader's head shifted by one above layer 2.

**Neutral**

- The renumber is invisible at runtime; `repo.layer` is read only by `check-layers.ts`.
- The false enforcement claim in 03 §5 is deleted rather than implemented.

## Revisit if

Two slices need to call each other often enough that events become contortion rather than design —
that is the signal this split cut in the wrong place, and the answer is probably one package with
the lint rule, not a same-layer exception. Also revisit if the boilerplate per slice grows enough
that `new-slice.ts` stops being able to hide it.
