import type { ErrorCode } from "@repo/errors";

export type Decision = { allowed: true } | { allowed: false; reason: string; code: ErrorCode };

export const allow = (): Decision => ({ allowed: true });

export function deny(reason: string, code: ErrorCode): Decision {
  return { allowed: false, reason, code };
}
