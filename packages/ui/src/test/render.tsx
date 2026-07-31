import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement } from "react";
import { expect } from "vitest";

import { TooltipProvider } from "../components/tooltip.tsx";

export function renderUi(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">): RenderResult {
  return render(ui, {
    ...options,
    wrapper: ({ children }) => <TooltipProvider>{children}</TooltipProvider>,
  });
}

/** Assert the rendered markup has no axe violations. */
export async function expectAccessible(container: HTMLElement): Promise<void> {
  const results = await axe.run(container);
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

function formatViolations(violations: axe.Result[]): string {
  if (violations.length === 0) {
    return "no axe violations";
  }

  return violations
    .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`)
    .join("\n");
}
