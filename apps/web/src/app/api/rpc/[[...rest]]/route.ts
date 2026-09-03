import { isAppError, normalizeError } from "@repo/errors";
import { captureUnexpectedException } from "@repo/observability";
import { ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin, SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins";

import { getContainer } from "../../../../server/container.ts";
import { createOrpcContext } from "../../../../server/context.ts";
import { appRouter } from "../../../../server/router.ts";

const EXPECTED_ORPC_CODES = new Set([
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
  "CSRF_TOKEN_MISMATCH",
]);

function isOrpcError(error: unknown): error is ORPCError<string, unknown> {
  return error instanceof ORPCError;
}

function orpcErrorCode(error: unknown): string | undefined {
  if (!isOrpcError(error)) {
    return undefined;
  }
  return error.code;
}

const handler = new RPCHandler(appRouter, {
  plugins: [new SimpleCsrfProtectionHandlerPlugin(), new BatchHandlerPlugin()],
  clientInterceptors: [
    async (options) => {
      try {
        return await options.next();
      } catch (error) {
        const { path, context } = options;
        const cause = isOrpcError(error) ? error.cause : undefined;
        const appError = isAppError(error) ? error : isAppError(cause) ? cause : undefined;
        const loggedError = appError ?? normalizeError(error);
        const actor = context.actor;
        const wireCode = orpcErrorCode(error);
        const code = appError?.code ?? wireCode ?? loggedError.message;
        const joinedPath = path.join(".");
        const expectedWireError =
          appError === undefined && wireCode !== undefined && EXPECTED_ORPC_CODES.has(wireCode);
        const orpcMessage = isOrpcError(error) ? error.message : loggedError.message;
        const message =
          appError?.message ?? (expectedWireError ? orpcMessage : loggedError.message);
        const details = {
          code,
          path: joinedPath,
          ...(appError === undefined ? {} : { context: appError.context }),
        };
        const logger = context.logger ?? getContainer().logger;

        if (
          (appError !== undefined && appError.expose && appError.severity === "expected") ||
          expectedWireError
        ) {
          logger.warn(details, message);
          throw error;
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
            path: joinedPath,
          },
        });
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

export const GET = handleRequest;
export const POST = handleRequest;
