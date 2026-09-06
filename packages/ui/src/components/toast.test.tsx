import { cleanup, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { expectAccessible, renderUi } from "../test/render.tsx";
import { createToastManager, Toaster } from "./toast.tsx";

afterEach(() => {
  cleanup();
});

describe("Toaster", () => {
  it("shows a toast from the manager and stays accessible", async () => {
    const manager = createToastManager();
    const user = userEvent.setup();
    renderUi(
      <Toaster toastManager={manager}>
        <button type="button" onClick={() => manager.add({ title: "Saved" })}>
          Notify
        </button>
      </Toaster>,
    );

    expect(typeof manager.add).toBe("function");

    await user.click(screen.getByRole("button", { name: "Notify" }));

    expect(await screen.findByRole("dialog", { name: "Saved" })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="toast-close"]')).not.toBeNull();
    await expectAccessible(document.body);
  });
});
