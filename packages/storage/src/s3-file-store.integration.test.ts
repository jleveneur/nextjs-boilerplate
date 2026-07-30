import { describe, expect, it } from "vitest";

import { buildObjectKey } from "./key.ts";
import { createFileStore } from "./s3-file-store.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is required for @repo/storage integration tests`);
  }

  return value;
}

describe("createFileStore (minio)", () => {
  it("presigns a put, uploads, and heads the object", async () => {
    const store = createFileStore({
      endpoint: requireEnv("S3_ENDPOINT"),
      region: process.env["S3_REGION"] ?? "auto",
      bucket: requireEnv("S3_BUCKET"),
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      forcePathStyle: true,
    });

    const key = buildObjectKey({
      appEnv: "test",
      organizationId: "01900000-0000-7000-8000-000000000010",
      entity: "asset",
      id: `01900000-0000-7000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`,
      filename: "hello.txt",
    });

    const put = await store.createPresignedPut({
      key,
      contentType: "text/plain",
      expiresInSeconds: 60,
    });

    const body = "hello minio";
    const response = await fetch(put.url, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body,
    });
    expect(response.ok).toBe(true);

    const head = await store.headObject(key);
    expect(head).toMatchObject({
      contentType: "text/plain",
      contentLength: body.length,
    });

    await store.deleteObject(key);
    await expect(store.headObject(key)).resolves.toBeUndefined();
  });
});
