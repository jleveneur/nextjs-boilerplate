import {
  AssetDerivationInputMissingError,
  deriveAssetVariants,
  systemActorForOrganization,
  type Ctx,
} from "@repo/core";
import { TerminalJobError, type JobHandler } from "@repo/jobs";
import type { Actor, AssetId, OrganizationId } from "@repo/types";
import type { Redis } from "ioredis";

import {
  beginJobIdempotency,
  completeJobIdempotency,
  releaseJobIdempotency,
} from "../idempotency.ts";

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
    const lease = await beginJobIdempotency(options.idempotencyRedis, payload.idempotencyKey);
    if (lease.status === "completed") {
      return;
    }
    if (lease.status === "in_progress") {
      throw new Error("idempotency lease held");
    }

    const organizationId = brandOrganizationId(payload.organizationId);
    const assetId = brandAssetId(payload.assetId);
    const ctx = options.buildCtx(systemActorForOrganization(organizationId));

    try {
      await deriveAssetVariants(ctx, { assetId });
      await completeJobIdempotency(options.idempotencyRedis, payload.idempotencyKey, lease.token);
    } catch (error) {
      await releaseJobIdempotency(options.idempotencyRedis, payload.idempotencyKey, lease.token);
      if (error instanceof AssetDerivationInputMissingError) {
        throw new TerminalJobError(error.message, { cause: error });
      }
      throw error;
    }
  };
}
