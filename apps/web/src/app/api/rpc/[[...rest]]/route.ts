import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";

import { describeRpcFailure } from "@repo/orpc";

import { getContainer } from "@/server/container.ts";
import { createOrpcContext } from "@/server/context.ts";
import { drainOutbox } from "@/server/drain-outbox.ts";
import { checkRateLimit, RPC_MAX_REQUESTS_PER_MINUTE } from "@/server/rate-limit.ts";
import { appRouter } from "@/server/router.ts";

const handler = new RPCHandler(appRouter, {
  allowMethods: ["POST"],
  plugins: [new BatchHandlerPlugin()],
  clientInterceptors: [
    async (options) => {
      try {
        return await options.next();
      } catch (error) {
        const container = getContainer();
        const logger = options.context.logger ?? container.logger;
        const failure = describeRpcFailure(error, options.path);
        const details = {
          code: failure.code,
          path: failure.path,
          ...(failure.context === undefined ? {} : { context: failure.context }),
        };

        if (failure.expected) {
          logger.warn(details, failure.message);
        } else {
          logger.error({ err: failure.err, ...details }, failure.message);
          container.errorTracker.capture(failure.err, {
            code: failure.code,
            operation: `rpc ${failure.path}`,
          });
        }

        throw error;
      }
    },
  ],
});

async function handleRequest(request: Request) {
  // Before context creation: resolving the session and the active organization
  // costs database round trips, so the ceiling has to sit in front of them.
  const limit = await checkRateLimit({
    request,
    cache: getContainer().cache,
    namespace: "rpc-rate-limit-client",
    maxRequests: RPC_MAX_REQUESTS_PER_MINUTE,
  });

  if (!limit.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { ...limit.headers, "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const { matched, response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: await createOrpcContext(request.headers),
  });

  if (!matched) {
    return new Response("Not found", { status: 404 });
  }

  for (const [key, value] of Object.entries(limit.headers)) {
    response.headers.set(key, value);
  }

  // After the handler's transaction has committed. Awaited rather than floated:
  // a detached promise in a serverless-style runtime can be killed when the
  // response is returned, and `drainOutbox` never throws.
  await drainOutbox();

  return response;
}

export const POST = handleRequest;
