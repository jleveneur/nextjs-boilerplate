/**
 * Sharp-based image derivatives: WebP + AVIF with EXIF stripped.
 *
 * Import `@repo/storage/image` from the worker only — never from a request
 * path or a Next.js server graph. The package root stays Sharp-free so
 * `createFileStore` cannot pull libvips into web/API bundles.
 */

// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

import sharp from "sharp";

import type { ImageDerivativeFormat } from "./derivative-key.ts";

export type ImageDerivatives = {
  [K in ImageDerivativeFormat]: {
    body: Uint8Array;
    contentType: string;
  };
};

const CONTENT_TYPES = {
  webp: "image/webp",
  avif: "image/avif",
} as const satisfies Record<ImageDerivativeFormat, string>;

export async function deriveImageVariants(input: Uint8Array): Promise<ImageDerivatives> {
  const pipeline = sharp(input).rotate(); // honour orientation, then strip EXIF via re-encode

  const [webp, avif] = await Promise.all([
    pipeline.clone().webp({ quality: 80 }).toBuffer(),
    pipeline.clone().avif({ quality: 50 }).toBuffer(),
  ]);

  return {
    webp: { body: new Uint8Array(webp), contentType: CONTENT_TYPES.webp },
    avif: { body: new Uint8Array(avif), contentType: CONTENT_TYPES.avif },
  };
}
