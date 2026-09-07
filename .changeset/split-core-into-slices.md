---
"@repo/kernel": major
"@repo/billing": major
"@repo/subscription": major
"@repo/assets": major
"@repo/contracts": major
"@repo/orpc": major
"@repo/auth": major
"@repo/permissions": major
"@repo/db": minor
---

Split `@repo/core` into a kernel plus one package per domain slice.

`@repo/core` is removed. Its shared surface — request context, side-effect
ports, the audit log, and the transactional outbox — is now `@repo/kernel`
(layer 2), and each domain slice is its own layer-3 package: `@repo/billing`,
`@repo/subscription`, and `@repo/assets`.

Transport moves to layer 4 and apps to layer 5 to open layer 3. The layer rule
is unchanged: strictly-lower-layer imports only, with no new exception.

Also in this release: the job queue is gone (no `CtxPorts.jobs`, no
`@repo/jobs`); the outbox relay dispatches to a handler registry supplied by
the composition root; the API-key feature is removed from `@repo/auth` and
`@repo/permissions`; `@repo/contracts` drops the `invoice-rest` schemas that only the deleted REST
transport used; and `@repo/db` gains `pingDatabase`.
