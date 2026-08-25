import { isAppError, normalizeError } from "@repo/errors";
import { captureUnexpectedException } from "@repo/observability";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { getContainer } from "../../../../server/container.ts";
import { createTrpcContext } from "../../../../server/context.ts";
import { appRouter } from "../../../../server/router.ts";

const EXPECTED_TRPC_CODES = new Set([
  "PARSE_ERROR",
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_SUPPORTED",
  "TIMEOUT",
  "CONFLICT",
  "PRECONDITION_FAILED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "UNPROCESSABLE_CONTENT",
  "TOO_MANY_REQUESTS",
  "CLIENT_CLOSED_REQUEST",
]);

async function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => createTrpcContext(request.headers),
    onError({ error, path, type, ctx }) {
      const appError = isAppError(error.cause) ? error.cause : undefined;
      const loggedError = appError ?? normalizeError(error.cause ?? error);
      const actor = ctx?.actor;
      const code = appError?.code ?? error.code;
      const message =
        appError?.message ??
        (EXPECTED_TRPC_CODES.has(error.code) ? error.message : loggedError.message);
      const details = {
        code,
        ...(path === undefined ? {} : { path }),
        type,
        ...(appError === undefined ? {} : { context: appError.context }),
      };
      const logger = ctx?.logger ?? getContainer().logger;

      if (
        (appError !== undefined && appError.expose && appError.severity === "expected") ||
        (appError === undefined && EXPECTED_TRPC_CODES.has(error.code))
      ) {
        logger.warn(details, message);
        return;
      }

      logger.error({ err: loggedError, ...details }, message);
      captureUnexpectedException(loggedError, {
        ...(actor === null || actor === undefined
          ? {}
          : {
              userId: actor.userId,
              organizationId: actor.organizationId,
            }),
        extra: {
          code,
          ...(path === undefined ? {} : { path }),
          type,
        },
      });
    },
  });
}

export const GET = handler;
export const POST = handler;
