/**
 * In-memory {@link FileStore} for unit tests.
 *
 * Presigned URLs are synthetic (`memory://…`); get/put/head/delete operate on the map.
 */

import type { FileStore } from "./types.ts";

type StoredObject = {
  contentType: string;
  body: Uint8Array;
};

export function createMemoryFileStore(): FileStore {
  const objects = new Map<string, StoredObject>();

  return {
    createPresignedPut(input) {
      const expiresInSeconds = input.expiresInSeconds ?? 300;
      return Promise.resolve({
        url: `memory://put/${input.key}?contentType=${encodeURIComponent(input.contentType)}`,
        key: input.key,
        expiresInSeconds,
      });
    },
    createPresignedGet(input) {
      const expiresInSeconds = input.expiresInSeconds ?? 300;
      return Promise.resolve({
        url: `memory://get/${input.key}`,
        key: input.key,
        expiresInSeconds,
      });
    },
    headObject(key) {
      const object = objects.get(key);
      if (object === undefined) {
        return Promise.resolve(undefined);
      }

      return Promise.resolve({
        contentType: object.contentType,
        contentLength: object.body.byteLength,
        etag: `"${String(object.body.byteLength)}"`,
      });
    },
    getObject(key) {
      const object = objects.get(key);
      if (object === undefined) {
        return Promise.resolve(undefined);
      }

      return Promise.resolve(object.body);
    },
    putObject(input) {
      objects.set(input.key, { body: input.body, contentType: input.contentType });
      return Promise.resolve();
    },
    deleteObject(key) {
      objects.delete(key);
      return Promise.resolve();
    },
  };
}
