import { waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { expectAccessible, renderUi } from "../test/render.tsx";
import { SimpleAreaChart, SimpleBarChart } from "./chart.tsx";

const SAMPLE = [
  { label: "A", value: 1 },
  { label: "B", value: 2 },
] as const;

/** Recharts is lazy-loaded; CI jsdom can take well over waitFor's 1s default. */
const CHART_LOAD_TIMEOUT_MS = 10_000;

async function waitForChart(container: HTMLElement): Promise<void> {
  await waitFor(
    () => {
      expect(container.querySelector("[data-slot='chart']")).not.toBeNull();
    },
    { timeout: CHART_LOAD_TIMEOUT_MS },
  );
}

describe("chart", () => {
  beforeAll(async () => {
    await import("recharts");
  });

  it("renders area chart and passes axe", async () => {
    const { container } = renderUi(<SimpleAreaChart data={SAMPLE} />);
    await waitForChart(container);
    await expectAccessible(container);
  });

  it("renders bar chart", async () => {
    const { container } = renderUi(<SimpleBarChart data={SAMPLE} />);
    await waitForChart(container);
  });
});
