/**
 * In-memory {@link FileStore} for unit tests.
 *
 * Presigned URLs are synthetic (`memory://…`); head/delete operate on the map.
 */

import type { FileStore } from "./types.ts";

type StoredObject = {
  contentType: string;
  body: Uint8Array;
};

export function createMemoryFileStore(): FileStore & {
  /** Test helper: store bytes as if a client completed a PUT. */
  putObject(key: string, body: Uint8Array, contentType: string): void;
} {
  const objects = new Map<string, StoredObject>();

  return {
    putObject(key, body, contentType) {
      objects.set(key, { body, contentType });
    },
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
    deleteObject(key) {
      objects.delete(key);
      return Promise.resolve();
    },
  };
}
