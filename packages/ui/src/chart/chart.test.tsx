import { describe, expect, it } from "vitest";

import { expectAccessible, renderUi } from "../test/render.tsx";
import { SimpleAreaChart, SimpleBarChart } from "./chart.tsx";

const SAMPLE = [
  { label: "A", value: 1 },
  { label: "B", value: 2 },
] as const;

describe("chart", () => {
  it("renders area chart and passes axe", async () => {
    const { container } = renderUi(<SimpleAreaChart data={SAMPLE} />);
    expect(container.querySelector("[data-slot='chart']")).not.toBeNull();
    await expectAccessible(container);
  });

  it("renders bar chart", () => {
    const { container } = renderUi(<SimpleBarChart data={SAMPLE} />);
    expect(container.querySelector("[data-slot='chart']")).not.toBeNull();
  });
});
