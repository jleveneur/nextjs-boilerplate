import { ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import { appRouter, createContext } from "@repo/api";
import { logger } from "@repo/logger";

/**
 * Codes this application throws on purpose.
 *
 * A caller being turned away is not a fault, and logging it at `error` trains
 * people to ignore the level that should mean "look at this". Anything not in
 * this set reached the handler unplanned and carries a stack worth keeping.
 */
const EXPECTED = new Set(["UNAUTHORIZED", "FORBIDDEN", "BAD_REQUEST", "NOT_FOUND", "CONFLICT"]);

/** `ORPCError` is generic over its code, so `instanceof` alone widens it to `any`. */
function expectedCode(error: unknown): string | null {
  if (!(error instanceof ORPCError)) {
    return null;
  }

  const code: unknown = error.code;
  return typeof code === "string" && EXPECTED.has(code) ? code : null;
}

// POST only. Combined with the `SameSite=Lax` session cookie, that is the CSRF
// control: a cross-site POST does not carry the cookie, so it arrives
// unauthenticated.
const handler = new RPCHandler(appRouter, {
  allowMethods: ["POST"],
  clientInterceptors: [
    async (options) => {
      try {
        return await options.next();
      } catch (error) {
        const path = options.path.join(".");
        const expected = expectedCode(error);

        if (expected === null) {
          logger.error({ err: error, path }, "rpc failed");
        } else {
          logger.warn({ path, code: expected }, "rpc rejected");
        }

        throw error;
      }
    },
  ],
});

export async function POST(request: Request): Promise<Response> {
  const { matched, response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: await createContext(request.headers),
  });

  if (!matched) {
    // No procedure by that name. Worth a line: it is what a probe or a stale
    // client looks like.
    logger.warn({ url: request.url }, "rpc route not matched");
    return new Response("Not found", { status: 404 });
  }

  return response;
}
