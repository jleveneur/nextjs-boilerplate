---
"@repo/storage": major
"@repo/core": major
---

Keep Sharp off the default `@repo/storage` and `@repo/core` entrypoints so Next.js and the API no longer load libvips. Import `@repo/storage/image` and `@repo/core/assets/derive` from the worker instead.
