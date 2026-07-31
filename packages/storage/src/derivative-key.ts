/**
 * Derivative object keys sit beside the original under the same prefix.
 *
 * `…/photo.jpg` → `…/photo.webp` / `…/photo.avif`
 */

export type ImageDerivativeFormat = "webp" | "avif";

export function derivativeObjectKey(originalKey: string, format: ImageDerivativeFormat): string {
  const slash = originalKey.lastIndexOf("/");
  const filename = slash === -1 ? originalKey : originalKey.slice(slash + 1);
  const prefix = slash === -1 ? "" : originalKey.slice(0, slash + 1);
  const dot = filename.lastIndexOf(".");
  const stem = dot === -1 ? filename : filename.slice(0, dot);
  return `${prefix}${stem}.${format}`;
}
