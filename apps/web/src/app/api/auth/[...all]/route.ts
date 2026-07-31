import { toNextJsHandler } from "better-auth/next-js";

import { getContainer } from "../../../../server/container.ts";

function handlers() {
  return toNextJsHandler(getContainer().auth);
}

export async function GET(request: Request) {
  return handlers().GET(request);
}

export async function POST(request: Request) {
  return handlers().POST(request);
}
