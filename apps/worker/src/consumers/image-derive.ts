import { asAssetId, asOrganizationId } from "@repo/contracts";
import { markAssetFailed, markAssetReady, systemActorForOrganization, type Ctx } from "@repo/core";
import { findAssetById } from "@repo/db";
import { TerminalJobError, type JobHandler } from "@repo/jobs";
import { derivativeObjectKey, deriveImageVariants, type FileStore } from "@repo/storage";
import type { Actor } from "@repo/types";
import type { Redis } from "ioredis";

import { claimJobIdempotency } from "../idempotency.ts";

export function createImageDeriveHandler(options: {
  buildCtx: (actor: Actor) => Ctx;
  files: FileStore;
  idempotencyRedis: Redis;
}): JobHandler<"image.derive"> {
  return async (payload) => {
    const claimed = await claimJobIdempotency(options.idempotencyRedis, payload.idempotencyKey);
    if (!claimed) {
      return;
    }

    const organizationId = asOrganizationId(payload.organizationId);
    const assetId = asAssetId(payload.assetId);
    const ctx = options.buildCtx(systemActorForOrganization(organizationId));

    const row = await findAssetById({ organizationId, db: ctx.db }, assetId);
    if (row === null) {
      throw new TerminalJobError(`asset ${payload.assetId} not found`);
    }

    if (row.status === "ready") {
      return;
    }

    try {
      const original = await options.files.getObject(row.storageKey);
      if (original === undefined) {
        throw new TerminalJobError(`object missing for asset ${payload.assetId}`);
      }

      const variants = await deriveImageVariants(original);
      await options.files.putObject({
        key: derivativeObjectKey(row.storageKey, "webp"),
        body: variants.webp.body,
        contentType: variants.webp.contentType,
      });
      await options.files.putObject({
        key: derivativeObjectKey(row.storageKey, "avif"),
        body: variants.avif.body,
        contentType: variants.avif.contentType,
      });

      await markAssetReady(ctx, assetId);
      ctx.logger.info({ assetId: payload.assetId }, "image.derive completed");
    } catch (error) {
      await markAssetFailed(ctx, assetId).catch(() => undefined);
      if (error instanceof TerminalJobError) {
        throw error;
      }
      throw error;
    }
  };
}
