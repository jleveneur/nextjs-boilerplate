# @repo/cache

## 0.0.1

### Patch Changes

- db14497: Add an atomic `setIfAbsent` operation for safely claiming cache keys across concurrent requests.
- 771731a: Resolve `server-only` through the workspace catalog so every server-boundary package shares one version.
