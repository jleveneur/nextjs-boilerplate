import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  confirmUploadInputSchema,
  requestUploadInputSchema,
  requestUploadOutputSchema,
} from "./asset.ts";

describe("asset contracts", () => {
  it("accepts a valid requestUpload input", () => {
    const parsed = requestUploadInputSchema.parse({
      filename: "photo.jpg",
      contentType: "image/jpeg",
      sizeBytes: 1024,
    });
    expect(parsed.sizeBytes).toBe(1024);
  });

  it("rejects oversized uploads", () => {
    expect(() =>
      requestUploadInputSchema.parse({
        filename: "huge.jpg",
        contentType: "image/jpeg",
        sizeBytes: MAX_UPLOAD_BYTES + 1,
      }),
    ).toThrow();
  });

  it("parses confirmUpload and requestUpload output shapes", () => {
    const assetId = "01900000-0000-7000-8000-000000000020";
    expect(confirmUploadInputSchema.parse({ assetId }).assetId).toBe(assetId);

    const output = requestUploadOutputSchema.parse({
      asset: {
        id: assetId,
        organizationId: "01900000-0000-7000-8000-000000000001",
        ownerUserId: "01900000-0000-7000-8000-0000000000aa",
        status: "pending",
        storageKey: "test/org/asset/id/photo.jpg",
        contentType: "image/jpeg",
        sizeBytes: 1024,
        originalFilename: "photo.jpg",
        createdAt: "2026-01-15T12:00:00.000Z",
        updatedAt: "2026-01-15T12:00:00.000Z",
      },
      upload: {
        url: "https://example.com/put",
        key: "test/org/asset/id/photo.jpg",
        expiresInSeconds: 300,
      },
    });
    expect(output.upload.expiresInSeconds).toBe(300);
  });
});
