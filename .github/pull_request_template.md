<!--
Keep this short. The goal is to give a reviewer the context they cannot get from
the diff — intent, alternatives, and risk. Delete any section that does not apply
rather than writing "N/A".
-->

## What and why

<!-- What changes, and what problem it solves. Link the issue: Closes #123 -->

## How this was verified

<!--
What you actually ran or observed, not what the test suite covers in general.
Screenshots or recordings for UI changes.
-->

## Risk

<!--
Delete the lines that do not apply.

- Database migration: is it reversible, and does it need a backfill?
- Breaking change for consumers, with the migration path
- Rollback plan, if it is anything other than redeploying the previous version
-->

---

## Checklist

- [ ] Title follows [Conventional Commits](https://www.conventionalcommits.org) — it becomes the squashed commit message
- [ ] `pnpm check` passes locally
- [ ] Tests cover the behaviour, not the implementation
- [ ] Every new query is scoped to the caller
- [ ] No secrets, tokens, or real customer data in code, tests, or fixtures
