# 0008 — Drizzle ORM version selection (0.45 stable vs 1.0 RC)

- **Status:** Accepted _(validated 2026-07-30, open question Q1)_
- **Date:** 2026-07-30
- **Deciders:** platform engineering
- **Related:** [06 — Data & storage](../architecture/06-data-and-storage.md), risk register R4

## Context

Drizzle is chosen as the ORM ([13](../architecture/13-dependency-review.md#drizzle-orm-045--drizzle-kit--drizzle-zod)).
Which _version_ to start on is a genuine fork, and it must be decided before the first migration is
written — because that is the moment the decision becomes expensive.

The state of the project on 2026-07-30:

- **`latest` is `drizzle-orm@0.45.2`**, with `drizzle-kit@0.31.10`.
- **`1.0.0-rc.4` was published 2026-06-27.** The v1 line has been in beta for roughly a year (through
  `beta.1` … `beta.23`, then four RCs).
- v1 brings: a **fully rewritten drizzle-kit** (DDL snapshots instead of database snapshots, reworked
  diff detection, introspection down from ~10 s to under 1 s), a **new v3 migration folder structure**
  with **no `journal.json`** (each migration gets its own folder, eliminating a notorious Git conflict
  point), **migration conflict detection** across branches, **Relational Queries v2**, and a migration
  table matched by full folder name rather than timestamp.

The asymmetry that makes this a real decision: **the v1 migration folder format change is free on day
zero and expensive later.** Migrating an existing project requires running `drizzle-kit up` against
real production migration history. Starting on v1 means simply never having the old format.

Against that: `1.0.0-rc.4` is a release candidate, and `latest` still points at `0.45.2` a year after
the v1 betas began — which is information about the project's release confidence, not just its
calendar.

## Options considered

**Start on `0.45.2` (current stable).**
The version the maintainers currently designate as `latest`, the one most documentation and community
answers target, and the one third-party packages (`drizzle-zod`) are built against. It is effectively
frozen — `0.45.2` was published amid the v1 betas — so we would be adopting a line receiving little
new work, and we would owe the v1 migration later, including the migration-folder conversion, at a
point when production migration history exists.

**Start on `1.0.0-rc.4`.**
Get the rewritten kit, the better migration format, and RQB v2 from the first commit, and pay zero
conversion cost. The risks are ordinary RC risks: the API may still shift before GA, RC-to-GA changes
would land on us, `drizzle-zod` compatibility must be verified against the RC rather than assumed, and
community answers will mostly describe 0.x. There is also a subtler risk specific to a foundation
repository: **a pinned RC is easy to forget.** A boilerplate reused for years can quietly carry a
pre-release version long past the point anyone remembers it was provisional.

**Start on `0.45.2` and plan the v1 upgrade as a scheduled, tracked task.**
Stable today, with the migration treated as committed work rather than a vague intention: an issue, an
owner, and a documented trigger (v1 GA), plus a note in the risk register so quarterly review surfaces
it.

**Use a different ORM to avoid the question.** Rejected — the ORM choice is settled on its own merits;
this is purely about timing.

## Decision

**Start on `drizzle-orm@0.45.2` with `drizzle-kit@0.31.10`, and treat the v1 upgrade as scheduled work
with a defined trigger.** Accepted 2026-07-30.

The reasoning, weighing the two honest arguments against each other:

The case for the RC is real — the free migration-format conversion is a genuine saving. But it is a
**one-time cost measured in roughly a day** for a project of this size, and it is bounded and
well-documented (`drizzle-kit up` handles the conversion, including the edge cases the maintainers
enumerate). Set against that, an RC pinned into a foundation repository carries an unbounded and
harder-to-see cost: **it is the kind of thing that gets forgotten at exactly the wrong moment**, and
"production-ready by default" is a stated principle of this repository, not a slogan. A foundation that
other projects inherit should not hand them a pre-release dependency they did not choose.

So the trade is: pay a bounded, scheduled day later, rather than accept an unbounded risk now.

Supporting measures that make this cheap to reverse and cheap to execute:

- **Queries are confined to `*.repository.ts` files** by the architecture, so the blast radius of any
  Drizzle change is a known, enumerable set of files rather than the whole codebase.
- **The upgrade is filed as an issue immediately**, with the trigger "drizzle-orm 1.0 GA" and R4 in the
  risk register pointing at it, so quarterly review cannot lose it.
- **Renovate is configured not to auto-merge Drizzle updates**, so the move is always a deliberate,
  reviewed PR.
- **If v1 reaches GA before implementation reaches the database phase** (Phase 3 in the
  [implementation plan](../architecture/14-implementation-plan.md)), we start on v1 instead and this ADR
  is superseded. That is the most likely happy outcome and worth watching for.

## Consequences

**Positive**

- No pre-release dependency in the foundation, consistent with "production-ready by default".
- Documentation, community answers, and `drizzle-zod` all match the version we run.
- The upgrade is tracked work with an owner and a trigger, not an intention.

**Negative**

- **We will pay the migration-folder conversion later**, on real migration history, when it would have
  been free now. This is the genuine cost of this recommendation and should not be glossed over.
- We forgo the rewritten kit's speed and migration-conflict detection in the interim.
- We start on a line receiving little active development.
- RQB v2 arrives later, so relational query code written now may need revising.

**Neutral**

- Either choice keeps the same architectural boundaries; only the timing of a known migration differs.

## Revisit if

Drizzle 1.0 reaches GA — at which point the upgrade is scheduled immediately. Or if v1 reaches GA
before Phase 3 of implementation begins, in which case we adopt v1 from the start and supersede this
ADR rather than performing a migration at all.
