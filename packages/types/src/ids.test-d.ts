/**
 * Type assertions for entity identifiers.
 *
 * Guards the property the whole multi-tenancy model leans on: that IDs naming
 * different things cannot be interchanged. If this file ever passes with the
 * brands removed, every tenant-scoped query has lost its compile-time check.
 */

import { assertType, describe, expectTypeOf, it } from "vitest";

import type { InvoiceId, MemberId, OrganizationId, UserId } from "./ids.ts";

/** Stands in for the kind of signature that makes swapped arguments possible. */
function addMember(_organizationId: OrganizationId, _userId: UserId): void {}

describe("entity identifiers", () => {
  it("are mutually unassignable", () => {
    expectTypeOf<UserId>().not.toExtend<OrganizationId>();
    expectTypeOf<OrganizationId>().not.toExtend<MemberId>();
    expectTypeOf<MemberId>().not.toExtend<UserId>();
    expectTypeOf<InvoiceId>().not.toExtend<OrganizationId>();
  });

  it("reject a plain string", () => {
    // @ts-expect-error an unvalidated string is not an OrganizationId
    assertType<OrganizationId>("org_01JQ");
  });

  it("are rejected in the wrong parameter position", () => {
    // The bug this package exists to prevent, in the shape it actually appears:
    // two same-typed parameters, swapped at the call site.
    const organizationId = "org_01JQ" as OrganizationId;
    const userId = "u_01JQ" as UserId;

    addMember(organizationId, userId);

    // @ts-expect-error arguments swapped — a cross-tenant write if it compiled
    addMember(userId, organizationId);
  });

  it("serialise as strings without a cast", () => {
    // Branding must not make IDs awkward at the edges, or people stop using it.
    const organizationId = "org_01JQ" as OrganizationId;
    expectTypeOf(`/orgs/${organizationId}`).toEqualTypeOf<string>();
    expectTypeOf(JSON.stringify({ organizationId })).toEqualTypeOf<string>();
  });
});
