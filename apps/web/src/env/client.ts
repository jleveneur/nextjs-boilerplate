import { createEnv } from "@repo/env/client";

import { webClientPresets, webClientRuntimeEnv } from "./browser.ts";

/**
 * Browser-safe env. Only `NEXT_PUBLIC_*` keys.
 */
export const env = createEnv({
  client: webClientPresets,
  runtimeEnv: webClientRuntimeEnv,
});
