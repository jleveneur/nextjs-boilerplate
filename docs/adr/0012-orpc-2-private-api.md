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
allow GET. `RPCLink` splits the former absolute `url` into `origin` plus a path-only `url`. `origin` is
resolved per request from `window.location`, not from `NEXT_PUBLIC_APP_URL`: a build-time
origin is wrong on any other host, and the failure is quiet — the call goes cross-origin,
`SameSite=Lax` withholds the session cookie, and everything returns 401.

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

## Deviations from the documented Next.js patterns

Two, both deliberate. Recorded here because the next reader will otherwise
"correct" them.

**No unified server/browser client.** oRPC's
[SSR guide](https://orpc.dev/docs/best-practices/optimize-ssr) recommends one
`client` shared by both runtimes — a `globalThis.$client` built with
`createRouterClient` and a lazy context on the server, an `RPCLink` in the
browser. We keep two: `createServerCaller(orgSlug)` for Server Components and
`orpcClient` for the browser.

The reason is multi-tenancy. That pattern derives its context from headers
alone, which works when the tenant lives in the session. Here the organization
comes from the URL, and `EnsureActiveOrg` only aligns the session in a client
effect — _after_ the server has rendered. A server caller reading
`session.activeOrganizationId` would serve the previous organization's data on
the first render after a switch. The URL is authoritative server-side; the
session is authoritative in the browser, where it has already caught up. That is
why `/api/rpc` calls `createOrpcContext(headers)` with no slug and Server
Components pass one.

Adopting the unified client would require the middleware to inject the slug as a
request header, trading an explicit tenant argument for an ambient one. In a
codebase whose first rule is "scope every query by `organization_id`", the
explicit argument is the point, not ceremony.

**Typed errors only where a caller can act on them.** oRPC recommends `.errors()`
for application-specific failures and plain `ORPCError` for common ones
([error handling](https://orpc.dev/docs/error-handling)). `AppError` →
`ORPCError` covers the common half. On top of that, `billing.void` declares
`CONFLICT` with a typed `data.appCode`, so the browser can tell "already paid"
from "already void" from a 500 without matching on message text.

The code stays `CONFLICT` rather than becoming `INVOICE_ALREADY_PAID`: a custom
code is legal but absent from `COMMON_ERROR_STATUS_MAP`, so the response would
lose its 409. The distinguishing detail belongs in `data`.

That map is written inline with plain string literals. Passing it through a
variable, or building the enum from `BILLING_ERROR_CODES`, widens the schema and
`data.appCode` infers as `unknown` — a contract that compiles and buys nothing.
`routers/billing.test.ts` asserts the literals still match the domain codes.

---

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
