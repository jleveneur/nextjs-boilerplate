import type { Ctx } from "@repo/core";
import type { Actor } from "@repo/types";

import type { AppContainer } from "./server/container.ts";

/** Hono env bindings for the public API. Kept off `app.ts` so middleware cannot cycle. */
export type ApiEnv = {
  Variables: {
    container: AppContainer;
    requestId: string;
    actor: Actor;
    apiKey: string;
    ctx: Ctx;
  };
};
