import { describe, expect, it } from "vitest";

import { renderUi } from "../test/render.tsx";
import { toast, Toaster } from "./toaster.tsx";

describe("Toaster", () => {
  it("renders without throwing and exports toast", () => {
    expect(() => renderUi(<Toaster />)).not.toThrow();
    expect(typeof toast).toBe("function");
  });
});
