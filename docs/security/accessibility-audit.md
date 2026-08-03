# Accessibility audit (manual)

Automated coverage: axe in shared UI tests and Playwright E2E (`@axe-core/playwright`, WCAG 2.2 AA
tags), plus Lighthouse accessibility ≥ 0.9. Automation catches roughly 30–40% of real issues —
complete this checklist for each release that changes primary UI
([10 — testing](../architecture/10-testing.md)).

---

## Evidence

| Field       | Value           |
| ----------- | --------------- |
| Date (UTC)  |                 |
| Auditor     |                 |
| Build / SHA |                 |
| Environment | local / staging |
| Overall     | pass / fail     |

---

## Keyboard

| Check                                                             | Result | Notes |
| ----------------------------------------------------------------- | ------ | ----- |
| Sign-in: Tab order reaches email, password, submit; visible focus |        |       |
| Sign-up: same                                                     |        |       |
| Primary authenticated view: skip/nav landmarks usable             |        |       |
| Dialogs/menus (if present): Escape closes; focus returns          |        |       |
| No keyboard trap                                                  |        |       |

---

## Screen reader (VoiceOver / NVDA / TalkBack)

| Check                                                             | Result | Notes |
| ----------------------------------------------------------------- | ------ | ----- |
| Page title and main landmark announced                            |        |       |
| Form labels and errors associated                                 |        |       |
| Auth errors announced on submit failure                           |        |       |
| Dynamic updates (toasts) announced without stealing focus wrongly |        |       |

---

## Other

| Check                                       | Result | Notes |
| ------------------------------------------- | ------ | ----- |
| 200% zoom / reflow usable on sign-in        |        |       |
| Meaning not by color alone on status badges |        |       |

---

## Findings

| ID  | WCAG | Severity | Description | Follow-up |
| --- | ---- | -------- | ----------- | --------- |
|     |      |          |             |           |
