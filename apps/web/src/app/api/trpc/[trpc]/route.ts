import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTrpcContext } from "../../../../server/context.ts";
import { appRouter } from "../../../../server/router.ts";

async function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => createTrpcContext(request.headers),
  });
}

export const GET = handler;
export const POST = handler;
