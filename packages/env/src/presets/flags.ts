import { z } from "zod";

import { emptyToUndefined } from "../coerce.ts";

/**
 * Feature-flag overrides as a JSON object string
 * (e.g. `{"new-billing-portal":true}`). Parsed by `@repo/flags`.
 */
export const featureFlags = z.object({
  FLAGS_JSON: z.preprocess(emptyToUndefined, z.string().min(2).optional()),
});
