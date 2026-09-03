/**
 * Asset upload wire contracts (oRPC / jobs). CamelCase in TypeScript.
 */

import { z } from "zod";

import { assetIdSchema, organizationIdSchema, userIdSchema } from "./ids.ts";
import { timestampsSchema } from "./timestamp.ts";

export const assetStatusSchema = z.enum(["pending", "ready", "failed"]);

export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const assetSchema = z
  .object({
    id: assetIdSchema,
    organizationId: organizationIdSchema,
    ownerUserId: userIdSchema,
    status: assetStatusSchema,
    storageKey: z.string().min(1),
    contentType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative().nullable(),
    originalFilename: z.string().nullable(),
  })
  .extend(timestampsSchema.shape);

export type Asset = z.infer<typeof assetSchema>;

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** 10 MiB — hard cap for browser-direct uploads in this phase. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const requestUploadInputSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_UPLOAD_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type RequestUploadInput = z.infer<typeof requestUploadInputSchema>;

export const requestUploadOutputSchema = z.object({
  asset: assetSchema,
  upload: z.object({
    url: z.string().url(),
    key: z.string().min(1),
    expiresInSeconds: z.number().int().positive(),
  }),
});

export type RequestUploadOutput = z.infer<typeof requestUploadOutputSchema>;

export const confirmUploadInputSchema = z.object({
  assetId: assetIdSchema,
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadInputSchema>;

export type ConfirmUploadOutput = Asset;
