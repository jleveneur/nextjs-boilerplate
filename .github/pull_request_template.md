<!--
Keep this short. The goal is to give a reviewer the context they cannot get from
the diff — intent, alternatives, and risk. Delete any section that does not apply
rather than writing "N/A".
-->

## What and why

<!-- What changes, and what problem it solves. Link the issue: Closes #123 -->

## Approach

<!--
Only if the diff does not make it obvious: the alternatives considered and why
this one won. If the decision is architectural, it needs an ADR — link it here.
-->

## How this was verified

<!--
What you actually ran or observed, not what the test suite covers in general.
Screenshots or recordings for UI changes.
-->

## Risk and rollout

<!--
Delete the lines that do not apply.

- Database migration: expand/contract phase, and whether it is reversible
- Backfill required, and how long it takes
- Feature flag gating this, and its default
- Breaking change for consumers, with the migration path
- Rollback plan, if it is anything other than redeploying the previous image
-->

---

## Checklist

- [ ] Title follows [Conventional Commits](https://www.conventionalcommits.org) — it becomes the squashed commit message
- [ ] Changeset added (`pnpm changeset`) if a `packages/*` public API changed
- [ ] `make check` passes locally
- [ ] Tests cover the behaviour, not the implementation
- [ ] Authorization checked at the boundary if this adds a data path
- [ ] No secrets, tokens, or real customer data in code, tests, or fixtures
- [ ] Docs or ADRs updated if this changes a documented decision
