import { describe, expect, it } from "vitest";

import { expectAccessible, renderUi } from "../test/render.tsx";
import { Toaster } from "./toaster.tsx";

describe("Toaster", () => {
  it("mounts the toast region", async () => {
    const { container } = renderUi(<Toaster />);
    expect(container.querySelector("[data-sonner-toaster]")).not.toBeNull();
    await expectAccessible(container);
  });
});
