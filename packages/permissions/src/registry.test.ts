import { describe, expect, it } from "vitest";

import {
  actionOf,
  ALL_ACTIONS,
  BUILT_IN_RESOURCES,
  DESTRUCTIVE_WHILE_IMPERSONATING,
  PERMISSIONS,
  productResources,
  resourceOf,
  toStatements,
} from "./registry.ts";

describe("registry", () => {
  it("keys every entry to its own value", () => {
    // The map is a lookup, not a rename table — a typo'd value would silently
    // register an action no role can ever be granted.
    for (const [key, value] of Object.entries(PERMISSIONS)) {
      expect(value).toBe(key);
    }
  });

  it("registers every action exactly once", () => {
    expect(new Set(ALL_ACTIONS).size).toBe(ALL_ACTIONS.length);
  });

  it("uses resource:action throughout", () => {
    for (const action of ALL_ACTIONS) {
      expect(action, action).toMatch(/^[a-zA-Z]+:[a-zA-Z]+$/);
    }
  });

  it("only bars actions that exist", () => {
    for (const action of DESTRUCTIVE_WHILE_IMPERSONATING) {
      expect(ALL_ACTIONS).toContain(action);
    }
  });
});

describe("resourceOf / actionOf", () => {
  it("splits on the first colon", () => {
    expect(resourceOf(PERMISSIONS["invoice:void"])).toBe("invoice");
    expect(actionOf(PERMISSIONS["invoice:void"])).toBe("void");
  });
});

describe("toStatements", () => {
  it("groups flat grants into the nested shape Better Auth expects", () => {
    expect(
      toStatements([
        PERMISSIONS["invoice:create"],
        PERMISSIONS["invoice:void"],
        PERMISSIONS["billing:read"],
      ]),
    ).toEqual({ invoice: ["create", "void"], billing: ["read"] });
  });

  it("drops resources the organization plugin already governs", () => {
    // Redeclaring these would fork Better Auth's own role semantics.
    expect(toStatements([PERMISSIONS["organization:delete"], PERMISSIONS["invoice:read"]])).toEqual(
      { invoice: ["read"] },
    );
  });

  it("keeps built-ins when asked, for the parity cross-check", () => {
    expect(toStatements([PERMISSIONS["organization:delete"]], { includeBuiltIn: true })).toEqual({
      organization: ["delete"],
    });
  });

  it("returns an empty object for no grants", () => {
    expect(toStatements([])).toEqual({});
  });
});

describe("productResources", () => {
  it("lists what the app owns, not what the plugin owns", () => {
    const resources = productResources();

    expect(resources).toEqual(expect.arrayContaining(["invoice", "billing", "apiKey", "asset"]));
    for (const builtIn of BUILT_IN_RESOURCES) {
      expect(resources).not.toContain(builtIn);
    }
  });
});
