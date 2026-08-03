import {
  AssetDerivationInputMissingError,
  deriveAssetVariants,
  systemActorForOrganization,
  type Ctx,
} from "@repo/core";
import { TerminalJobError, type JobHandler } from "@repo/jobs";
import type { Actor, AssetId, OrganizationId } from "@repo/types";
import type { Redis } from "ioredis";

import { claimJobIdempotency } from "../idempotency.ts";

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- job payload brand
  return id as OrganizationId;
}

function brandAssetId(id: string): AssetId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- job payload brand
  return id as AssetId;
}

export function createImageDeriveHandler(options: {
  buildCtx: (actor: Actor) => Ctx;
  idempotencyRedis: Redis;
}): JobHandler<"image.derive"> {
  return async (payload) => {
    const claimed = await claimJobIdempotency(options.idempotencyRedis, payload.idempotencyKey);
    if (!claimed) {
      return;
    }

    const organizationId = brandOrganizationId(payload.organizationId);
    const assetId = brandAssetId(payload.assetId);
    const ctx = options.buildCtx(systemActorForOrganization(organizationId));

    try {
      await deriveAssetVariants(ctx, { assetId });
    } catch (error) {
      if (error instanceof AssetDerivationInputMissingError) {
        throw new TerminalJobError(error.message, { cause: error });
      }
      throw error;
    }
  };
}
