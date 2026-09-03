# 0011 — oRPC for the private API

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** platform engineering
- **Related:** [0003 — One domain core behind two API transports](./0003-one-domain-core-two-transports.md), [05 — Runtime architecture & API strategy](../architecture/05-runtime-and-api.md)

## Context

[ADR-0003](./0003-one-domain-core-two-transports.md) keeps business rules in `@repo/core` and
exposes them through two transports: a compile-time private API for the first-party web app, and
versioned REST/OpenAPI for third parties.

The private transport was tRPC 11. The layering made that a replaceable choice — resolvers are
thin wrappers — and oRPC 1.x now covers the same job with a smaller client, a built-in serializer
(no SuperJSON), first-party TanStack Query helpers, and a CSRF plugin that matches the threat
model in [07](../architecture/07-auth.md). oRPC 2 is still on the beta channel; pinning 1.15
avoids taking that major before it is stable.

oRPC can also generate OpenAPI from the same procedures. That is **not** why we adopt it. The
public API stays Hono + `@hono/zod-openapi` on `apps/api`, with `/v1`, `snake_case`, RFC 9457,
idempotency keys, and per-key quotas. Serving third parties from the private RPC tree would
collapse the two-audience split ADR-0003 exists to protect.

## Options considered

**Stay on tRPC 11.** Mature, default in this ecosystem, already working. Rejected because the
exit cost is low _now_ (eleven procedures, all one-liners over core) and will only rise, and
because oRPC 1.x already covers the private-API requirements without SuperJSON or a React
provider.

**Jump to oRPC 2 beta.** Newest APIs, one fewer future migration. Rejected: this repo pins
stable releases. 2.x lands as its own ADR when `latest` points at it.

**Unify private and public surfaces on oRPC OpenAPI.** One procedure tree, RPC for the app and
REST for customers. Rejected: the public contract is not an RPC dump. Casing, error shape,
versioning, and HTTP semantics would be forced to follow the internal client.

**REST internally as well.** One surface. Rejected for the same reason as in ADR-0003: we would
give up compile-time types or reintroduce them via codegen.

## Decision

**Use oRPC 1.15 as the private API transport, in `@repo/orpc`, mounted in `apps/web` at
`/api/rpc`.**

- Layered procedures stay `public` / `protected` / `org`.
- Input and output schemas still come from `@repo/contracts`.
- `AppError` maps to `ORPCError` with the stable code on `data.appCode`.
- Session cookies plus `SimpleCsrfProtection*` plugins (custom `x-csrf-token` header).
- Batch requests stay enabled (`BatchHandlerPlugin` / `BatchLinkPlugin`).
- The public API remains Hono + OpenAPI on `apps/api`. oRPC OpenAPI generation is not used.
- SuperJSON is removed; oRPC's serializer covers `Date` / `Map` / `Set`.

ADR-0003's one-core-two-transports rule is unchanged. Only the private transport library
changes.

## Consequences

**Positive**

- Same end-to-end types, without a React provider or SuperJSON.
- CSRF custom-header protection is implemented, not only documented.
- A smaller client graph on interactive routes.
- The next major (oRPC 2) is a catalog bump plus an ADR, not a rewrite.

**Negative**

- Smaller ecosystem than tRPC; hiring and examples skew tRPC.
- oRPC 2 will still need a dedicated upgrade when it is stable.
- Two RPC-shaped libraries exist in the industry narrative (tRPC vs oRPC); docs must keep
  saying we did **not** merge the public REST surface into oRPC.

**Neutral**

- The fetch path is `/api/rpc` instead of `/api/trpc`.
- Package rename: `@repo/trpc` → `@repo/orpc`.

## Revisit if

oRPC 2 is published as `latest`, or a second first-party client needs a stable contract — in
which case it still goes through the public REST surface, not through private RPC.
