/**
 * S3 API {@link FileStore} — works against R2, MinIO, and AWS S3.
 */

import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { CreateFileStoreOptions, FileStore } from "./types.ts";

const DEFAULT_PUT_EXPIRY = 300;
const DEFAULT_GET_EXPIRY = 300;

export function createFileStore(options: CreateFileStoreOptions): FileStore {
  const client = new S3Client({
    endpoint: options.endpoint,
    region: options.region,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    forcePathStyle: options.forcePathStyle ?? true,
  });

  return {
    async createPresignedPut(input) {
      const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_PUT_EXPIRY;
      const command = new PutObjectCommand({
        Bucket: options.bucket,
        Key: input.key,
        ContentType: input.contentType,
      });
      const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      return { url, key: input.key, expiresInSeconds };
    },

    async createPresignedGet(input) {
      const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_GET_EXPIRY;
      const command = new GetObjectCommand({
        Bucket: options.bucket,
        Key: input.key,
      });
      const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      return { url, key: input.key, expiresInSeconds };
    },

    async headObject(key) {
      try {
        const result = await client.send(
          new HeadObjectCommand({ Bucket: options.bucket, Key: key }),
        );
        return {
          contentType: result.ContentType,
          contentLength: result.ContentLength,
          etag: result.ETag,
        };
      } catch (error) {
        if (isNotFound(error)) {
          return undefined;
        }

        throw error;
      }
    },

    async deleteObject(key) {
      await client.send(new DeleteObjectCommand({ Bucket: options.bucket, Key: key }));
    },
  };
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const name = "name" in error ? error.name : undefined;
  const metadata = "$metadata" in error ? error.$metadata : undefined;
  const status =
    typeof metadata === "object" &&
    metadata !== null &&
    "httpStatusCode" in metadata &&
    typeof metadata.httpStatusCode === "number"
      ? metadata.httpStatusCode
      : undefined;

  return name === "NotFound" || name === "NoSuchKey" || status === 404;
}
