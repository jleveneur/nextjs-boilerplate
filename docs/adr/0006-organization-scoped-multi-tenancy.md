# 0006 — Organization-scoped multi-tenancy on a shared schema

- **Status:** Accepted _(validated 2026-07-30, open question Q3)_
- **Date:** 2026-07-30
- **Deciders:** platform engineering
- **Related:** [06 — Data & storage](../architecture/06-data-and-storage.md#3-multi-tenancy)

## Context

Whether the foundation is multi-tenant is the **single most invasive schema decision** available. It
touches every table, every query, every policy, and every test.

It is also strongly asymmetric in cost. Adding a tenant discriminator on day zero costs a column and a
context type. Retrofitting it onto a live product means a migration on every table, backfilling
ownership for existing rows (often ambiguous), auditing every query, and doing it all without a window
where cross-tenant leakage is possible.

Most products this foundation will produce are B2B SaaS, where teams and shared workspaces are
expected. Some will be single-user tools where an organization concept is pure overhead.

## Options considered

**Single-tenant (no organizations).** Simplest: resources belong to a user. Best possible experience
for a personal tool. Retrofitting teams later is the expensive migration described above, and it
arrives exactly when the product is succeeding and least wants a risky migration.

**Database-per-tenant.** The strongest isolation, and the easiest story for enterprise data residency
and per-tenant restore. Operationally heavy: migrations must run across N databases, connection
management multiplies, cross-tenant analytics require federation, and onboarding a tenant becomes a
provisioning operation. Appropriate at high contract values with few tenants; wrong as a default.

**Schema-per-tenant.** A middle ground. In practice it inherits most of database-per-tenant's
migration pain, plus `search_path` fragility, and Postgres degrades with thousands of schemas.

**Shared schema with a tenant discriminator.** One database, one schema, `organization_id` on every
tenant-scoped table. Standard for B2B SaaS. Isolation depends on every query being correctly filtered,
which is where the risk lives.

**Shared schema plus mandatory Row-Level Security.** The same model with the database enforcing
isolation as a backstop.

## Decision

**Shared schema with an `organization_id` discriminator on every tenant-scoped table, enforced
primarily by the type system, with RLS available but off by default.** Accepted 2026-07-30.

Users belong to organizations through a `member` row carrying a role
([ADR-0005](./0005-better-auth-with-rbac-and-policies.md)), using Better Auth's organization plugin.
Single-user products model this as a personal organization created automatically at signup, so the
concept is present but invisible in the UI — which preserves the option without imposing the ceremony.

Isolation is enforced in three layers, and the ordering is the substance of this decision:

1. **A tenant-scoped context type.** `orgProcedure` produces a `TenantCtx` containing a resolved
   `organizationId`. Repository functions for tenant-scoped tables accept `TenantCtx`, **not** `Ctx`,
   so calling one without a tenant is a **compile error**. This is the primary control because it is
   free, total, and catches the mistake before it can be written.
2. **Scoped query helpers.** `scopedSelect(tenantCtx, table)` applies the filter, so the common path
   cannot omit it.
3. **Row-Level Security, optional.** Policies keyed on a per-transaction session variable.

`organization_id` is the **leading column of composite indexes**, since every query filters on it and a
trailing tenant column cannot serve isolation efficiently.

**Why RLS is not mandatory** — this is the part most likely to be questioned, so the reasoning is
explicit. With a transaction-mode connection pooler, the per-session `SET` must occur inside every
transaction; if it does not, it silently applies to the wrong pooled connection. That failure mode is
_worse than having no RLS_, because it looks like it is working. RLS also complicates migrations and
legitimately cross-tenant background jobs. It is recommended when handling regulated data, **after**
the pooling model has been pinned down. Types are the cheaper and more reliable primary control.

Cross-tenant access for admin and support paths uses an explicit `SystemCtx`, a separate repository
function, and a mandatory audit-log entry. The escape hatch is named, narrow, and logged rather than
being an ambient capability.

## Consequences

**Positive**

- The expensive retrofit is avoided permanently.
- Forgetting a tenant filter is a compile error, not a production leak.
- One database to migrate, back up, and monitor.
- Teams, invitations, and roles work from the first release, which is what B2B customers ask for
  first.
- Cross-tenant analytics are ordinary SQL.

**Negative**

- **Every query and test carries a tenant concept**, including in products that will never need one.
  This is real, permanent overhead and the main argument against.
- Isolation is enforced in application code by default, so a deliberate bypass is possible. Mitigated
  by types, helpers, and mandatory isolation tests per repository function.
- A "noisy neighbour" tenant can affect others; per-tenant rate limits and query timeouts are
  required rather than optional.
- Per-tenant restore is hard — restoring one tenant from a shared database is a manual operation.
- Enterprise customers demanding physical isolation cannot be served without a separate deployment.

**Neutral**

- Personal organizations mean single-user products carry the model without exposing it.
- Every tenant-scoped repository function gets a generated pair of isolation tests. Boilerplate,
  written anyway, because this is the highest-severity bug class in the system.

## Revisit if

An enterprise contract requires physical data isolation or per-tenant residency — at which point
database-per-tenant for that tier, alongside the shared pool for self-serve, is the standard answer,
and the shared-schema code continues to work unchanged against a per-tenant connection.
