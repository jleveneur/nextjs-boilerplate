# @repo/orpc

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
