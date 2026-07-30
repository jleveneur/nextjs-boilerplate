import type { FileStore, ObjectHead, PresignedGet, PresignedPut } from "../ports/file-store.ts";

export function createInMemoryFileStore(): FileStore & {
  readonly keys: ReadonlySet<string>;
} {
  const objects = new Map<string, { contentType: string }>();

  return {
    get keys() {
      return new Set(objects.keys());
    },
    createPresignedPut(input): Promise<PresignedPut> {
      objects.set(input.key, { contentType: input.contentType });
      return Promise.resolve({
        url: `memory://put/${input.key}`,
        key: input.key,
        expiresInSeconds: input.expiresInSeconds ?? 900,
      });
    },
    createPresignedGet(input): Promise<PresignedGet> {
      return Promise.resolve({
        url: `memory://get/${input.key}`,
        key: input.key,
        expiresInSeconds: input.expiresInSeconds ?? 900,
      });
    },
    headObject(key: string): Promise<ObjectHead | undefined> {
      const obj = objects.get(key);
      if (obj === undefined) {
        return Promise.resolve(undefined);
      }

      return Promise.resolve({
        contentType: obj.contentType,
        contentLength: 0,
        etag: undefined,
      });
    },
    deleteObject(key: string): Promise<void> {
      objects.delete(key);
      return Promise.resolve();
    },
  };
}
