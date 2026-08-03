/**
 * Map Stripe price/product metadata → entitlement feature keys.
 *
 * Convention: metadata key `entitlements` is a comma-separated list
 * (e.g. `billing:pro,exports:enabled`).
 */

export function entitlementKeysFromMetadata(
  metadata: Record<string, string> | null | undefined,
): string[] {
  if (metadata === null || metadata === undefined) {
    return [];
  }
  const raw = metadata["entitlements"];
  if (raw === undefined || raw.trim() === "") {
    return [];
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
