import { z } from "zod";

/**
 * S3-compatible object storage.
 *
 * Works against Cloudflare R2 in production and MinIO locally — both speak the
 * S3 API. `S3_ENDPOINT` is required so the client never silently targets AWS.
 */
export const s3 = z.object({
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1).default("auto"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
});
