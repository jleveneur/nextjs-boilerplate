import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectAccessible, renderUi } from "../test/render.tsx";
import { Icon, Search01Icon } from "./index.ts";

describe("Icon", () => {
  it("renders an accessible decorative icon", async () => {
    const { container } = renderUi(
      <Icon icon={Search01Icon} aria-label="Search" data-testid="search-icon" />,
    );
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
    await expectAccessible(container);
  });
});
