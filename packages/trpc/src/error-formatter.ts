/**
 * Attach stable `appCode` (and a safe message) when the TRPCError cause is an AppError.
 */

import { isAppError } from "@repo/errors";

export type TrpcErrorShape = {
  message: string;
  data: Record<string, unknown>;
};

export type FormatTrpcErrorInput = {
  shape: TrpcErrorShape;
  error: { cause?: unknown };
};

export function formatTrpcError({ shape, error }: FormatTrpcErrorInput): TrpcErrorShape & {
  data: Record<string, unknown> & { appCode?: string };
} {
  const cause = error.cause;
  if (isAppError(cause)) {
    return {
      ...shape,
      message: cause.expose ? cause.message : shape.message,
      data: {
        ...shape.data,
        appCode: cause.code,
      },
    };
  }

  return shape;
}
