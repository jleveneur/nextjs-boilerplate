/**
 * Image-derivative application service.
 *
 * Lives on `@repo/core/assets/derive` so Sharp stays out of the default
 * `@repo/core` graph (API and Next.js request paths).
 */

import { authorize, PERMISSIONS } from "@repo/authz";
import { findAssetById } from "@repo/db";
import { derivativeObjectKey } from "@repo/storage";
import { deriveImageVariants } from "@repo/storage/image";
import type { AssetId } from "@repo/types";

import type { Ctx } from "../ctx.ts";
import { AssetDerivationInputMissingError } from "./asset.errors.ts";
import { markAssetFailed, markAssetReady, tenantCtx } from "./asset.service.ts";

export async function deriveAssetVariants(ctx: Ctx, input: { assetId: AssetId }): Promise<void> {
  authorize(ctx.actor, PERMISSIONS["asset:create"], {
    organizationId: ctx.actor.organizationId,
  });

  const existing = await findAssetById(tenantCtx(ctx), input.assetId);
  if (existing === null) {
    throw new AssetDerivationInputMissingError(input.assetId, "asset");
  }

  if (existing.status === "ready") {
    return;
  }

  try {
    const original = await ctx.ports.files.getObject(existing.storageKey);
    if (original === undefined) {
      throw new AssetDerivationInputMissingError(input.assetId, "source_object");
    }

    const variants = await deriveImageVariants(original);
    await ctx.ports.files.putObject({
      key: derivativeObjectKey(existing.storageKey, "webp"),
      body: variants.webp.body,
      contentType: variants.webp.contentType,
    });
    await ctx.ports.files.putObject({
      key: derivativeObjectKey(existing.storageKey, "avif"),
      body: variants.avif.body,
      contentType: variants.avif.contentType,
    });

    await markAssetReady(ctx, input.assetId);
    ctx.logger.info({ assetId: input.assetId }, "asset variants derived");
  } catch (error) {
    await markAssetFailed(ctx, input.assetId).catch(() => undefined);
    throw error;
  }
}
