import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectAccessible, renderUi } from "../test/render.tsx";
import { Fade } from "./fade.tsx";

describe("Fade", () => {
  it("renders children", async () => {
    const { container } = renderUi(<Fade>Hello</Fade>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    await expectAccessible(container);
  });
});
