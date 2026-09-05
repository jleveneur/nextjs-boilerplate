# @repo/storage

## 1.0.0

### Major Changes

- 28841e8: Keep Sharp off the default `@repo/storage` and `@repo/core` entrypoints so Next.js and the API no longer load libvips. Import `@repo/storage/image` and `@repo/core/assets/derive` from the worker instead.

## 0.0.1

### Patch Changes

- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.
