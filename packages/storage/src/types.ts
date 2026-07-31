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

export type BuildObjectKeyInput = {
  appEnv: string;
  organizationId: string;
  entity: string;
  /** Asset id — typically a UUIDv7. */
  id: string;
  /** Original filename; slugified into the final segment. */
  filename: string;
};

export type PutObjectInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
};

/**
 * Object storage port. Bytes for worker-side derivation go through get/put;
 * browsers use presigned URLs only.
 */
export type FileStore = {
  createPresignedPut(input: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<PresignedPut>;
  createPresignedGet(input: { key: string; expiresInSeconds?: number }): Promise<PresignedGet>;
  headObject(key: string): Promise<ObjectHead | undefined>;
  getObject(key: string): Promise<Uint8Array | undefined>;
  putObject(input: PutObjectInput): Promise<void>;
  deleteObject(key: string): Promise<void>;
};

export type CreateFileStoreOptions = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Force path-style URLs — required for MinIO. */
  forcePathStyle?: boolean;
};
