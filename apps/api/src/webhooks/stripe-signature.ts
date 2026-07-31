import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Stripe webhook signature check (Phase 9 skeleton).
 *
 * Full Stripe SDK / event typing lands with `@repo/payments` in Phase 17.
 */
export function verifyStripeSignature(options: {
  payload: string;
  header: string | undefined;
  secret: string;
  /** Reject timestamps older than this many seconds. Default 5 minutes. */
  toleranceSeconds?: number;
}): boolean {
  if (options.header === undefined || options.header === "") {
    return false;
  }

  const parts = Object.fromEntries(
    options.header.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""] as const;
    }),
  );

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (timestamp === undefined || timestamp === "" || signature === undefined || signature === "") {
    return false;
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return false;
  }

  const tolerance = options.toleranceSeconds ?? 300;
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (ageSeconds > tolerance) {
    return false;
  }

  const expected = createHmac("sha256", options.secret)
    .update(`${timestamp}.${options.payload}`)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function extractStripeEventId(payload: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(payload);
    if (typeof parsed !== "object" || parsed === null || !("id" in parsed)) {
      return undefined;
    }
    const id: unknown = Reflect.get(parsed, "id");
    return typeof id === "string" && id !== "" ? id : undefined;
  } catch {
    return undefined;
  }
}
