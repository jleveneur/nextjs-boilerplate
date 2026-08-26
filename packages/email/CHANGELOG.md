# @repo/email

## 0.0.2

### Patch Changes

- 364069f: Source email components from `react-email` instead of the deprecated
  `@react-email/components`. Every version of that package — and the whole
  `@react-email/*` component scope — was deprecated upstream in April 2026 when
  the components were folded into the main `react-email` package, which now also
  re-exports `@react-email/render`.

## 0.0.1

### Patch Changes

- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.
