# 0001 — Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-07-30
- **Deciders:** platform engineering

## Context

This repository is intended to be the foundation of multiple products over several years. Its
architecture contains a number of decisions that look arbitrary without their reasoning — for
example banning `baseUrl` in `tsconfig.json`, refusing to abstract the ORM, or deliberately not
authorizing requests in `proxy.ts`.

Two failure modes follow from undocumented decisions, and both are expensive:

1. A future maintainer "fixes" a deliberate constraint, reintroducing the problem it prevented.
2. A future maintainer preserves an accidental constraint forever, assuming it was deliberate.

Both are caused by the same missing information: the _why_. Code shows what was decided. Commit
messages show when. Neither shows what alternatives were weighed or what was knowingly sacrificed.

## Options considered

**Nothing — rely on code, commits, and PR discussion.** Zero cost, and it is what most projects do.
PR discussions are the closest thing to a record, but they are not indexed, not discoverable from
the code they affect, and they disappear behind whichever platform hosts them.

**A wiki or external document store (Notion, Confluence).** Comfortable to write in and easy to
organise. Drifts from the code immediately because it is not in the review path, and it becomes
inaccessible to anyone who is not in that workspace — including future contributors and AI agents
working from the repository.

**Long-form comments in the code.** Colocated with the code, which is genuinely valuable. But
comments describe a file, not a cross-cutting decision, and they cannot record rejected
alternatives without becoming essays that reviewers skip.

**ADRs in the repository (MADR-lite).** Versioned with the code, reviewed in the same PR, greppable,
renderable in the docs site, and readable by both humans and agents. The cost is discipline: an ADR
that nobody writes is worth nothing, and an ADR nobody updates is misleading.

## Decision

We keep **numbered, append-only ADRs in `docs/adr/`**, in a MADR-lite format, and we split
responsibility explicitly between two kinds of document:

- **Architecture documents** (`docs/architecture/`) describe the system in the **present tense** and
  are updated whenever it changes.
- **ADRs** record **decisions and their moments** and are never rewritten. A changed decision means
  a new ADR that supersedes the old one.

This split is the part that makes the practice survive. Documents that double as history become
fiction, because every update has to choose between describing what is true and preserving what was
true. Separating them means each can be honest.

Every ADR must state its **negative consequences**. A decision recorded without its costs is
advocacy, and it deprives the future reader of the thing they most need: knowing what was traded
away, so they can tell whether the trade still holds.

## Consequences

**Positive**

- The reasoning behind expensive decisions survives staff turnover and long gaps between projects.
- Rejected options are recorded, so debates are not relitigated from scratch.
- Onboarding improves markedly: a new engineer (or agent) can read _why_ before touching _what_.
- Reviewing an ADR is far cheaper than reviewing the implementation of a bad decision.

**Negative**

- Ongoing discipline is required; a stale or absent ADR is worse than none, because it implies a
  completeness that is not there.
- Writing an ADR slows the decision down. This is usually a benefit and occasionally an irritation.
- Judging what deserves an ADR is a matter of taste, so the boundary will be applied inconsistently.

**Neutral**

- ADRs are rendered by the documentation site, so they become part of the published documentation.
- Numbering is permanent and never reused, so gaps from abandoned proposals are expected.
