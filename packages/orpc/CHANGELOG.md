# @repo/orpc

## 1.0.0

### Major Changes

- 853dfef: Split `@repo/core` into a kernel plus one package per domain slice.

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

### Patch Changes

- Updated dependencies [853dfef]
  - @repo/kernel@1.0.0
  - @repo/billing@1.0.0
  - @repo/subscription@1.0.0
  - @repo/assets@1.0.0
  - @repo/contracts@1.0.0
  - @repo/permissions@1.0.0
  - @repo/db@0.3.0

## 0.4.0

### Minor Changes

- 1e64899: `billing.void` declares a typed error contract: `CONFLICT` with `data.appCode`
  narrowed to the refusals a caller can act on (`INVOICE_ALREADY_PAID`,
  `INVOICE_ALREADY_VOID`).

  `appCode` was already on the wire but untyped, so no client could branch on it
  without matching message text. The oRPC code stays `CONFLICT` rather than becoming
  the domain code: a custom code is absent from `COMMON_ERROR_STATUS_MAP` and the
  response would lose its 409.

- 3dd67e6: `createCallerFactory` takes an optional failure reporter.

  Server Components call services through the in-process caller, which never touches
  the `/api/rpc` route and its interceptor. Their failures surfaced as a rendered
  `error.tsx` and nothing else — no log line, no tracker event. The hook runs the same
  `describeRpcFailure` policy as the RPC route, so the two entry points cannot disagree
  about what counts as an incident.

  Optional: existing callers, including tests, keep working unchanged.

### Patch Changes

- @repo/db@0.2.3
  - @repo/core@1.1.2

## 0.3.1

### Patch Changes

- Updated dependencies [26b826e]
  - @repo/permissions@0.1.0
  - @repo/core@1.1.1

## 0.3.0

### Minor Changes

- d4bbdd3: Upgrade the private API transport from oRPC 1.15 to 2.0.0-beta.33 (ADR-0012).

### Patch Changes

- e120a37: Extract `describeRpcFailure` so the web RPC route can log expected vs unexpected errors without inlining the classification.
- Updated dependencies [b526fa4]
- Updated dependencies [6aae087]
  - @repo/db@0.2.2
  - @repo/auth@0.2.0
  - @repo/core@1.1.0

## 0.2.2

### Patch Changes

- @repo/db@0.2.1
  - @repo/auth@0.1.2
  - @repo/core@1.0.1

## 0.2.1

### Patch Changes

- Updated dependencies [28841e8]
  - @repo/core@1.0.0

## 0.2.0

### Minor Changes

- bfb8003: Replace tRPC with oRPC 1.15 as the private API transport (ADR-0011).

## 0.1.2

Private API transport. Replaces `@repo/trpc` (ADR-0011).
