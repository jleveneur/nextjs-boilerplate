// oxlint-disable-next-line import/no-unassigned-import -- credential firewall
import "server-only";

import { describeRpcFailure, type CallerFailureReporter } from "@repo/orpc";

import { getContainer } from "./container.ts";

/**
 * Log and report a failure raised by the in-process caller.
 *
 * Server Components call services directly, so their failures never touch the
 * `/api/rpc` route and its interceptor. Without this they surface as a rendered
 * `error.tsx` and nothing else — the one class of production error with no log
 * line and no tracker event.
 *
 * Deliberately the same policy as the RPC route: `describeRpcFailure` decides
 * what is an expected client error and what is an incident, so the two entry
 * points cannot disagree about which is which.
 */
export const reportCallerFailure: CallerFailureReporter = (error, path) => {
  const container = getContainer();
  const failure = describeRpcFailure(error, path);
  const details = {
    code: failure.code,
    path: failure.path,
    ...(failure.context === undefined ? {} : { context: failure.context }),
  };

  if (failure.expected) {
    container.logger.warn(details, failure.message);
    return;
  }

  container.logger.error({ err: failure.err, ...details }, failure.message);
  container.errorTracker.capture(failure.err, {
    code: failure.code,
    operation: `rsc ${failure.path}`,
  });
};
