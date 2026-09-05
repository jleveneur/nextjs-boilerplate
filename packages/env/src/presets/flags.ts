import { z } from "zod";

const flagsRecord = z.record(z.string(), z.boolean());

/**
 * Feature-flag overrides as a JSON object string
 * (e.g. `{"new-billing-portal":true}`). Parsed here so a typo fails boot
 * instead of becoming a silent empty map in `@repo/flags`.
 */
export const featureFlags = z.object({
  FLAGS_JSON: z
    .string()
    .optional()
    .transform((value, ctx): Record<string, boolean> | undefined => {
      if (value === undefined) return undefined;

      try {
        const parsed: unknown = JSON.parse(value);
        const result = flagsRecord.safeParse(parsed);
        if (!result.success) {
          ctx.addIssue({
            code: "custom",
            message: "must be a JSON object mapping flag names to booleans",
          });
          return z.NEVER;
        }
        return result.data;
      } catch {
        ctx.addIssue({ code: "custom", message: "must be valid JSON" });
        return z.NEVER;
      }
    }),
});
