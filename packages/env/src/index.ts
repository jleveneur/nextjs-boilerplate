import { createEnv } from "@t3-oss/env-nextjs";

import { client, server } from "./schema.ts";

/**
 * The validated environment, parsed once when this module is first imported.
 *
 * t3-env does two things a bare `schema.parse(process.env)` cannot: it reports
 * every invalid variable in one message instead of one restart at a time, and
 * it throws if server-side configuration is read from browser code — so a
 * secret cannot reach the client by way of an import nobody noticed.
 */
export const env = createEnv({
  server,
  client,

  // Next replaces `process.env.NEXT_PUBLIC_FOO` only where it appears
  // literally in the source, so each client variable has to be destructured
  // here by hand. Server variables are read straight from `process.env`.
  experimental__runtimeEnv: {},

  // A `.env` line like `BETTER_AUTH_URL=` sets the empty string rather than
  // leaving the variable unset, which would satisfy `.optional()` and skip
  // `.default()`. Treat it as missing.
  emptyStringAsUndefined: true,
});
