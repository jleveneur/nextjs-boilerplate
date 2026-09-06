import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";

import { describeRpcFailure } from "@repo/orpc";

import { getContainer } from "@/server/container.ts";
import { createOrpcContext } from "@/server/context.ts";
import { appRouter } from "@/server/router.ts";

const handler = new RPCHandler(appRouter, {
  allowMethods: ["POST"],
  plugins: [new BatchHandlerPlugin()],
  clientInterceptors: [
    async (options) => {
      try {
        return await options.next();
      } catch (error) {
        const logger = options.context.logger ?? getContainer().logger;
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
        }

        throw error;
      }
    },
  ],
});

async function handleRequest(request: Request) {
  const { matched, response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: await createOrpcContext(request.headers),
  });

  if (!matched) {
    return new Response("Not found", { status: 404 });
  }

  return response;
}

export const POST = handleRequest;
