import { reconcileOrphanAssets, systemActorForOrganization, type Ctx } from "@repo/core";
import type { JobHandler } from "@repo/jobs";
import type { Actor, OrganizationId } from "@repo/types";

/** Sentinel org for system-wide reconcile (repositories use explicit org per row). */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- well-known sentinel
const SYSTEM_ORG = "01900000-0000-7000-8000-000000000000" as OrganizationId;

const DEFAULT_AGE_MS = 24 * 60 * 60 * 1000;

export function createAssetReconcileHandler(options: {
  buildCtx: (actor: Actor) => Ctx;
}): JobHandler<"asset.reconcile-orphans"> {
  return async (payload) => {
    const olderThan =
      payload.olderThanIso === undefined
        ? new Date(Date.now() - DEFAULT_AGE_MS)
        : new Date(payload.olderThanIso);

    const ctx = options.buildCtx(systemActorForOrganization(SYSTEM_ORG));
    const result = await reconcileOrphanAssets(ctx, olderThan);
    ctx.logger.info({ failed: result.failed, olderThan }, "asset.reconcile-orphans completed");
  };
}
