/**
 * Object-storage port (presign / head / delete).
 *
 * Mirrors `@repo/storage`'s FileStore without importing that package at the
 * type boundary for every consumer — composition roots adapt the adapter.
 */

export type ObjectHead = {
  contentType: string | undefined;
  contentLength: number | undefined;
  etag: string | undefined;
};

export type PresignedPut = {
  url: string;
  key: string;
  expiresInSeconds: number;
};

export type PresignedGet = {
  url: string;
  key: string;
  expiresInSeconds: number;
};

export type FileStore = {
  createPresignedPut(input: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<PresignedPut>;
  createPresignedGet(input: { key: string; expiresInSeconds?: number }): Promise<PresignedGet>;
  headObject(key: string): Promise<ObjectHead | undefined>;
  deleteObject(key: string): Promise<void>;
};
