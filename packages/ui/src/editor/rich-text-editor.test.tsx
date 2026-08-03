import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectAccessible, renderUi } from "../test/render.tsx";
import { RichTextEditor } from "./rich-text-editor.tsx";

describe("RichTextEditor", () => {
  it("renders toolbar and passes axe", async () => {
    const { container } = renderUi(
      <RichTextEditor value="<p>Hello</p>" onChange={() => undefined} />,
    );
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    await expectAccessible(container);
  });
});
