import { describe, expect, it } from "vitest";

import { apiKeyPrefixForEnv } from "./api-key-prefix.ts";
import { isOrganizationRole, permissionsForOrganizationRole } from "./role-permissions.ts";

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
    const member = permissionsForOrganizationRole("member");
    const owner = permissionsForOrganizationRole("owner");
    for (const permission of member) {
      expect(owner).toContain(permission);
    }
    expect(owner).toContain("organization:delete");
  });
});
