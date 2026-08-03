# Accessibility audit (manual)

Automated coverage: axe in shared UI tests and Playwright E2E (`@axe-core/playwright`, WCAG 2.2 AA
tags), plus Lighthouse accessibility ≥ 0.9. Automation catches roughly 30–40% of real issues —
complete this checklist for each release that changes primary UI
([10 — testing](../architecture/10-testing.md)).

---

## Evidence

| Field       | Value                                                         |
| ----------- | ------------------------------------------------------------- |
| Date (UTC)  | 2026-08-03                                                    |
| Auditor     | automated (Playwright keyboard-auth + axe); screen reader TBD |
| Build / SHA | post-`f77c37a` Phase 16 follow-up (see git history)           |
| Environment | local (`apps/web` Playwright webServer / prod-like compose)   |
| Overall     | **pass** for automated keyboard + axe; screen reader not run  |

---

## Keyboard

| Check                                                             | Result | Notes                                                                   |
| ----------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| Sign-in: Tab order reaches email, password, submit; visible focus | pass   | `e2e/keyboard-auth.spec.ts` — Tab reaches Sign in; axe WCAG 2.2 AA      |
| Sign-up: same                                                     | pass   | same spec                                                               |
| Primary authenticated view: skip/nav landmarks usable             | —      | not covered by keyboard-auth smoke (no authenticated shell in this run) |
| Dialogs/menus (if present): Escape closes; focus returns          | —      | no dialogs on auth surfaces exercised                                   |
| No keyboard trap                                                  | pass   | Tab reaches submit without trap on sign-in / sign-up / magic-link       |

---

## Screen reader (VoiceOver / NVDA / TalkBack)

| Check                                                             | Result  | Notes                                   |
| ----------------------------------------------------------------- | ------- | --------------------------------------- |
| Page title and main landmark announced                            | not run | requires human VoiceOver / NVDA session |
| Form labels and errors associated                                 | not run |                                         |
| Auth errors announced on submit failure                           | not run |                                         |
| Dynamic updates (toasts) announced without stealing focus wrongly | not run |                                         |

---

## Other

| Check                                       | Result  | Notes                         |
| ------------------------------------------- | ------- | ----------------------------- |
| 200% zoom / reflow usable on sign-in        | not run | manual                        |
| Meaning not by color alone on status badges | not run | no badges on auth smoke paths |

---

## Findings

| ID  | WCAG | Severity | Description | Follow-up |
| --- | ---- | -------- | ----------- | --------- |
|     |      |          |             |           |

Automated run (2026-08-03): `pnpm --filter @repo/web exec playwright test e2e/keyboard-auth.spec.ts` — **3 passed**.
