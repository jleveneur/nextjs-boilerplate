import { RPCHandler } from "@orpc/server/fetch";

import { appRouter, createContext } from "@repo/api";

// POST only. Combined with the `SameSite=Lax` session cookie, that is the CSRF
// control: a cross-site POST does not carry the cookie, so it arrives
// unauthenticated.
const handler = new RPCHandler(appRouter, { allowMethods: ["POST"] });

export async function POST(request: Request): Promise<Response> {
  const { matched, response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: await createContext(request.headers),
  });

  return matched ? response : new Response("Not found", { status: 404 });
}
