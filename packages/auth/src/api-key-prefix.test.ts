import { describe, expect, it } from "vitest";

import { isOrganizationRole, permissionsForRole } from "@repo/permissions";

import { apiKeyPrefixForEnv } from "./api-key-prefix.ts";

describe("apiKeyPrefixForEnv", () => {
  it("uses live prefix in production and test elsewhere", () => {
    expect(apiKeyPrefixForEnv("production")).toBe("sk_live_");
    expect(apiKeyPrefixForEnv("local")).toBe("sk_test_");
    expect(apiKeyPrefixForEnv("staging")).toBe("sk_test_");
  });
});

describe("role permissions", () => {
  it("recognises organization roles", () => {
    expect(isOrganizationRole("owner")).toBe(true);
    expect(isOrganizationRole("guest")).toBe(false);
  });

  it("gives owners a superset of member permissions", () => {
    const member = permissionsForRole("member");
    const owner = permissionsForRole("owner");
    for (const permission of member) {
      expect(owner).toContain(permission);
    }
    expect(member).toContain("asset:create");
    expect(member).toContain("asset:read");
    expect(owner).toContain("organization:delete");
  });
});
