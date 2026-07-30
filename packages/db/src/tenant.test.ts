import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import type { OrganizationId } from "@repo/types";

import { asset } from "./schema/asset.sql.ts";
import { scopedWhere, tenantFilter } from "./tenant.ts";

const ORG_A = "01900000-0000-7000-8000-0000000000aa" as OrganizationId;

describe("tenantFilter", () => {
  it("returns a SQL expression for the organization column", () => {
    const predicate = tenantFilter(asset, ORG_A);
    expect(predicate).toBeDefined();
  });
});

describe("scopedWhere", () => {
  it("returns a SQL expression when only the tenant filter is supplied", () => {
    const predicate = scopedWhere({ organizationId: ORG_A }, asset);
    expect(predicate).toBeDefined();
  });

  it("accepts additional predicates without throwing", () => {
    const assetId = "01900000-0000-7000-8000-0000000000a1";
    const predicate = scopedWhere({ organizationId: ORG_A }, asset, eq(asset.id, assetId));
    expect(predicate).toBeDefined();
  });

  it("ignores undefined additional predicates", () => {
    const predicate = scopedWhere({ organizationId: ORG_A }, asset, undefined);
    expect(predicate).toBeDefined();
  });
});
