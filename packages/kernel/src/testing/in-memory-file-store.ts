import type { FileStore, ObjectHead, PresignedGet, PresignedPut } from "../ports/file-store.ts";

export function createInMemoryFileStore(): FileStore & {
  readonly keys: ReadonlySet<string>;
} {
  const objects = new Map<string, { contentType: string; body: Uint8Array }>();

  return {
    get keys() {
      return new Set(objects.keys());
    },
    createPresignedPut(input): Promise<PresignedPut> {
      // Mark key as reserved so head/get work before an explicit putObject.
      if (!objects.has(input.key)) {
        objects.set(input.key, { contentType: input.contentType, body: new Uint8Array() });
      }
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
        contentLength: obj.body.byteLength,
        etag: undefined,
      });
    },
    getObject(key: string): Promise<Uint8Array | undefined> {
      const obj = objects.get(key);
      if (obj === undefined) {
        return Promise.resolve(undefined);
      }

      return Promise.resolve(obj.body);
    },
    putObject(input): Promise<void> {
      objects.set(input.key, { contentType: input.contentType, body: input.body });
      return Promise.resolve();
    },
    deleteObject(key: string): Promise<void> {
      objects.delete(key);
      return Promise.resolve();
    },
  };
}
