# 0012 — oRPC 2 for the private API

- **Status:** Accepted
- **Date:** 2026-09-06
- **Deciders:** platform engineering
- **Amends:** [0011 — oRPC for the private API](./0011-orpc-private-api.md)
- **Related:** [0003 — One domain core behind two API transports](./0003-one-domain-core-two-transports.md), [05 — Runtime architecture & API strategy](../architecture/05-runtime-and-api.md), [07 — Auth](../architecture/07-auth.md)

## Context

[ADR-0011](./0011-orpc-private-api.md) adopted oRPC as the private API transport and pinned 1.15
because 2.x was (and still is) on the `beta` npm dist-tag. The revisit trigger was "oRPC 2 is
published as `latest`". Taking the major earlier is now cheaper than waiting: procedures are
still thin wrappers over `@repo/core`, v1 and v2 are wire-incompatible so a later upgrade is the
same coordinated deploy, and v2 ships deprecated aliases for most renames.

The load-bearing breaks for this repo are CSRF, GET, and the RPC Link URL shape. v2 removed
`SimpleCsrfProtection*` (the custom `x-csrf-token` pair ADR-0011 relied on). GET is rejected by
default; CSRF for cookie-authenticated GET is a dedicated plugin we do not need if we never
allow GET. `RPCLink` splits the former absolute `url` into `origin` plus a path-only `url`.

`npm view @orpc/server dist-tags` still has `latest` at 1.15.0 and `beta` at 2.0.0-beta.33.

## Options considered

**Stay on oRPC 1.15 until `latest` is 2.x.** What ADR-0011 chose. Rejected now: the remaining
wait does not shrink the upgrade, and 1.x will not receive the v2 wire format or handler
defaults.

**Jump to oRPC 2 beta, keep a custom-header CSRF check ourselves.** Closest to the ADR-0011
threat-model wording. Rejected: it reimplements a plugin the library deleted, and POST-only RPC
plus `SameSite=Lax` session cookies already close the browser CSRF paths that plugin targeted.

**Jump to oRPC 2 beta, POST-only, no GET.** Newest APIs, one fewer future migration, CSRF model
matches the library's. Costs a pin on a pre-1.0-of-the-major line.

**Unify private and public surfaces on oRPC OpenAPI.** Rejected for the same reason as in
ADR-0011.

## Decision

**Use oRPC 2 (currently `2.0.0-beta.33`) as the private API transport.** Catalog pins stay
exact; server and browser client upgrade in the same change.

- Layered procedures, `AppError` → `ORPCError` with `data.appCode`, and `/api/rpc` are
  unchanged from ADR-0011.
- The handler allows `POST` only. The Next.js route exports `POST`, not `GET`.
- CSRF: Better Auth session cookies (`SameSite=Lax`) plus POST-only RPC. No custom
  `x-csrf-token` header. Do not add GET without `GetMethodCsrfProtectionHandlerPlugin` and an
  explicit revisit of this decision.
- Batch plugins stay enabled. The v1 `exclude` option is gone; we do not need `filter`.
- HTTP status for error codes comes from the handler's `COMMON_ERROR_STATUS_MAP` default.
  `ORPCError` no longer carries `status`.
- The public API remains Hono + OpenAPI on `apps/api`. oRPC OpenAPI generation is still not
  used.

When `latest` points at 2.x, drop the beta pin — that is a catalog bump, not a new transport
decision.

## Consequences

**Positive**

- One coordinated jump instead of a second breaking upgrade after GA.
- GET is closed at the handler, which is the CSRF control v2 actually ships for this protocol.
- Procedure and caller code stays on the supported builder (`os`, `.handler`,
  `createRouterClient`).

**Negative**

- We pin a beta of a load-bearing transport. APIs and the wire format can still move before
  2.0.0.
- Custom-header CSRF is gone. Defense in depth for cookie-authenticated RPC is now
  SameSite + method restriction, not a synchronizer token.
- v1 RPC Link clients cannot talk to this server (and vice versa). First-party only, and they
  ship together.

**Neutral**

- The fetch path is still `/api/rpc`.
- TanStack Query helpers stay in `@orpc/tanstack-query`.

## Revisit if

`latest` on `@orpc/server` points at 2.x (drop the beta pin), a beta breaks the wire or
handler API in a way that is expensive to chase, or we need GET (HTTP caching) — which requires
the GET CSRF plugin and must not be enabled casually.
