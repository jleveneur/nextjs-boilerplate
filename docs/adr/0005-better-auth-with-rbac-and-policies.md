# 0005 — Better Auth with database sessions, RBAC plus record-level policies

- **Status:** Accepted
- **Date:** 2026-07-30
- **Deciders:** platform engineering
- **Related:** [07 — Authentication & authorization](../architecture/07-auth.md)

## Context

Three decisions are entangled here and are recorded together because choosing them separately
produces an incoherent result: **which auth library, which session model, and which authorization
model.**

Requirements: self-hostable with no vendor holding the identity graph; multi-tenant organizations with
roles; API keys for the public API; modern methods (OAuth, passkeys, 2FA); immediate revocation; and
an authorization model that can express both "admins may invite members" and "this user may edit
_this_ invoice".

Authentication is also the clearest case for buying rather than building. Sessions are easy. Correct
password reset, user-enumeration resistance, OAuth edge cases, passkey ceremonies, and 2FA recovery
are not, and getting any of them wrong is a security incident rather than a bug.

## Options considered

### Library

**Auth.js / NextAuth.** The incumbent, with the widest provider list. Its adapter model treats your
database as a foreign store, and multi-tenancy, API keys, and RBAC are all left to you. The v4→v5
transition demonstrated how much churn a thin abstraction over many providers carries.

**Clerk / WorkOS / Auth0 / Kinde.** Better products in isolation — excellent UIs, compliance, and
support. They hold the identity graph, price per user, and cannot be self-hosted. That is a direct
contradiction of our cloud-agnostic principle, and it is the one integration where being unable to
leave is most consequential.

**Supabase Auth.** Good, and arrives attached to Supabase.

**Lucia.** Deprecated by its author into a learning resource. Its lesson — that session handling is
not where the difficulty lies — is worth taking seriously.

**Hand-rolled.** Full control, and precisely the "genuinely hard problem" the dependency bar exists
for. Rejected.

**Better Auth.** Auth tables live in our PostgreSQL database and are generated into our migrations;
fully self-hostable; TypeScript-native with plugin types flowing to call sites; first-class Drizzle
adapter; and maintained plugins for organizations/RBAC, API keys, passkeys, and 2FA.

### Session model

**Stateless JWTs.** No database lookup per request, and horizontally scalable with no shared state.
But a stolen or stale token remains valid until it expires — logout, password change, and role
revocation cannot take effect immediately. The workarounds (very short expiry with refresh rotation,
or a denylist) reintroduce the state that JWTs were meant to avoid.

**Database sessions.** Revocable immediately, inspectable, and enumerable per user. Costs a lookup
per request.

**Database sessions with a signed cookie cache.** Better Auth's model: a short-lived signed snapshot
in the cookie avoids the lookup on most requests while the database remains authoritative.

### Authorization model

**RBAC alone.** Simple and auditable. It cannot express ownership, resource state, or relationships.
Systems that try end up encoding ownership into role names (`invoice-editor-for-org-123`), which
neither scales nor audits.

**ABAC / a policy engine (Cedar, OPA, Casbin).** Fully expressive, and a policy language plus an
evaluation service to operate and debug. Disproportionate here, and it moves authorization logic out
of TypeScript where our types cannot check it.

**RBAC for coarse capabilities plus policy functions for record-level rules.** Two mechanisms, each
covering what the other cannot.

## Decision

**Better Auth 1.6, database sessions with the cookie cache, and RBAC plus record-level policies.**

Specifics that matter:

- **Sessions** are HTTP-only, `Secure`, `SameSite=Lax` cookies referencing a database row, rotated on
  privilege and password change. Stateless JWTs are rejected for browser sessions because the
  property people want from them is obtainable via the cookie cache, while the property they lose
  (revocation) is a requirement.
- **API keys** for the public API: hashed at rest, prefixed (`sk_live_…`) so leak scanners can detect
  them, scoped to a permission subset, and revocable instantly. They resolve to **the same `Actor`
  shape as a session**, so core services cannot apply weaker rules to third parties.
- **RBAC** via Better Auth's organization plugin and `createAccessControl`, with **static,
  code-defined roles**. Dynamic (database-stored, runtime-created) roles are deliberately **off**:
  passing static `roles` makes role parameters a literal union, so a `string` from a request body will
  not typecheck, and the workaround is a cast — which erases the safety the union provided. Static
  roles are diffable, reviewable, and testable. Dynamic roles are enabled only if a product genuinely
  needs customer-authored roles, accepting the typing consequences explicitly at that point.
- Custom roles are **composed from `adminAc`/`memberAc`** rather than written from scratch, because a
  custom `ac` overrides the plugin's defaults and Better Auth's own methods check specific statements
  internally. Omitting them makes built-in operations start returning "unauthorized" for roles that
  should have them — a confusing failure worth recording.
- **`@repo/authz` is a pure package**: no database, no session, no network. `can(actor, action,
resource)` is a pure function, which makes the entire authorization model exhaustively unit-testable
  in milliseconds. Complete role × state matrices are affordable, which is not true of tests needing a
  database and a session.
- **Authorization happens first, inside the service** — never in a resolver, a component, or
  `proxy.ts`. `proxy.ts` runs on Node in Next 16 and therefore _could_ query the database; it
  deliberately does not, because a check made in the proxy is invisible from the service it protects,
  leaving any other path to that service unguarded.
- **Policies receive the loaded resource, not an id**, so the tenant check happens against real data.
  This is the specific mitigation for broken object-level authorization, the most common API
  vulnerability.

## Consequences

**Positive**

- We own the identity graph. Users, sessions, and password hashes are portable SQL.
- Immediate revocation on logout, password change, and role change.
- One `Actor` abstraction means the web app and the public API are subject to identical rules.
- The authorization model is exhaustively testable and fast, so coverage is realistic rather than
  aspirational.
- Passkeys, 2FA, and OAuth arrive as configuration rather than projects.

**Negative**

- Better Auth moves quickly (1.6.25, with 1.7 in RC). We pin exactly, read changelogs, and gate
  upgrades on the auth E2E suite. This is ongoing maintenance a hosted IdP would absorb for us.
- We own auth operations: email deliverability for verification, rate limiting, and abuse handling.
- Two authorization mechanisms mean a reviewer must know which applies where.
- A session lookup on cookie-cache misses is a small latency cost that a JWT would not have.
- Static roles mean adding a role is a deploy, not a settings change.

**Neutral**

- Better Auth's tables live in our migrations, so its schema changes appear in our migration reviews.
- Impersonation exists for support, and is deliberately noisy: time-boxed, reason-required,
  audit-logged, banner-marked, and barred from destructive actions.

## Revisit if

A compliance requirement (SOC 2 with enterprise SSO, SCIM provisioning) makes a dedicated identity
provider cheaper than building it — at which point WorkOS becomes a serious option for the enterprise
tier specifically, while Better Auth continues to serve self-serve users.
