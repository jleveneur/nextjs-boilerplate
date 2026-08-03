import { expect, type Page } from "@playwright/test";

/**
 * Smoke that the named submit control is focusable (Phase 16 keyboard coverage
 * for primary auth surfaces). Sequential Tab order is in the manual checklist.
 */
export async function expectKeyboardReachableSubmit(page: Page, submitName: RegExp): Promise<void> {
  const submit = page.getByRole("button", { name: submitName });
  await expect(submit).toBeVisible();
  await submit.focus();
  await expect(submit).toBeFocused();
  const tabIndex = await submit.evaluate((el) => {
    if (!(el instanceof HTMLElement)) {
      return -1;
    }
    return el.tabIndex;
  });
  expect(tabIndex === -1).toBe(false);
}
