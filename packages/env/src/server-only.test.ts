/**
 * Proves `@repo/env/server` cannot be imported from a client-marked context.
 *
 * `server-only` resolves to a module that throws under the default (client)
 * export condition, and to an empty module under `react-server`. Vitest and
 * plain Node use the default condition, so importing the server entry here is
 * exactly what a Client Component bundler would do — and it must fail.
 *
 * Next.js Server Components set the `react-server` condition, so the same
 * import succeeds there. Workers that are not React server runtimes should
 * compose from `@repo/env/shared` + `@repo/env/presets` instead.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("@repo/env/server", () => {
  it("imports server-only as its first side effect", () => {
    // Belt: even if someone removes the runtime throw, the source contract stays
    // greppable and reviewable.
    const source = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
    expect(source).toMatch(/^import ["']server-only["'];/m);
  });

  it("throws when imported under the default (client) export condition", async () => {
    // The Phase 2 acceptance criterion: a client-marked import fails.
    await expect(import("./server.ts")).rejects.toThrow(
      /cannot be imported from a Client Component/i,
    );
  });
});
