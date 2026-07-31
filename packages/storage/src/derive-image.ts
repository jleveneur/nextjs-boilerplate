/**
 * Sharp-based image derivatives: WebP + AVIF with EXIF stripped.
 *
 * Runs in the worker process only — never on the request path.
 */

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
