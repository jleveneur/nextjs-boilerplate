import { describe, expect, it } from "vitest";

import { buildObjectKey } from "./key.ts";

describe("buildObjectKey", () => {
  it("builds env/org/entity/id/slug", () => {
    expect(
      buildObjectKey({
        appEnv: "local",
        organizationId: "01900000-0000-7000-8000-000000000010",
        entity: "asset",
        id: "01900000-0000-7000-8000-0000000000a1",
        filename: "My Report.PDF",
      }),
    ).toBe(
      "local/01900000-0000-7000-8000-000000000010/asset/01900000-0000-7000-8000-0000000000a1/my-report-pdf",
    );
  });

  it("rejects path traversal in segments", () => {
    expect(() =>
      buildObjectKey({
        appEnv: "local",
        organizationId: "../evil",
        entity: "asset",
        id: "id1",
        filename: "a.png",
      }),
    ).toThrow(/organizationId/);
  });
});
