/**
 * Asset upload application services.
 *
 * Authorize → validate → persist (+ outbox) → return. Bytes never transit here.
 */

import { authorize, PERMISSIONS } from "@repo/authz";
import {
  MAX_UPLOAD_BYTES,
  type ConfirmUploadInput,
  type ConfirmUploadOutput,
  type RequestUploadInput,
  type RequestUploadOutput,
} from "@repo/contracts";
import {
  findAssetById,
  insertAsset,
  listStalePendingAssets,
  updateAssetStatus,
  withTransaction,
  type TenantCtx,
} from "@repo/db";
import { NotFoundError, ValidationError } from "@repo/errors";
import { buildObjectKey } from "@repo/storage";
import type { AssetId, OrganizationId } from "@repo/types";

import type { Ctx } from "../ctx.ts";
import { writeOutboxEvent } from "../outbox/write-outbox-event.ts";
import { assetConfirmedEvent, ASSET_CONFIRMED } from "./asset.events.ts";
import { toAssetDto } from "./asset.mapper.ts";

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB/boundary brand
  return id as OrganizationId;
}

function brandAssetId(id: string): AssetId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB/boundary brand
  return id as AssetId;
}

function tenantCtx(ctx: Ctx): TenantCtx {
  return {
    organizationId: ctx.actor.organizationId,
    db: ctx.tx ?? ctx.db,
  };
}

export async function requestUpload(
  ctx: Ctx,
  input: RequestUploadInput,
): Promise<RequestUploadOutput> {
  authorize(ctx.actor, PERMISSIONS["asset:create"], {
    organizationId: ctx.actor.organizationId,
  });

  if (input.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new ValidationError({
      message: `Upload exceeds maximum size of ${String(MAX_UPLOAD_BYTES)} bytes`,
    });
  }

  const id = ctx.ports.ids.assetId();
  const storageKey = buildObjectKey({
    appEnv: ctx.ports.appEnv,
    organizationId: ctx.actor.organizationId,
    entity: "asset",
    id,
    filename: input.filename,
  });

  const row = await insertAsset(tenantCtx(ctx), {
    id,
    organizationId: ctx.actor.organizationId,
    ownerUserId: ctx.actor.userId,
    storageKey,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    originalFilename: input.filename,
    status: "pending",
  });

  const upload = await ctx.ports.files.createPresignedPut({
    key: storageKey,
    contentType: input.contentType,
  });

  return { asset: toAssetDto(row), upload };
}

export async function confirmUpload(
  ctx: Ctx,
  input: ConfirmUploadInput,
): Promise<ConfirmUploadOutput> {
  authorize(ctx.actor, PERMISSIONS["asset:create"], {
    organizationId: ctx.actor.organizationId,
  });

  return withTransaction(ctx.db, async (tx) => {
    const scoped: Ctx = { ...ctx, tx };
    const tenant = tenantCtx(scoped);

    const existing = await findAssetById(tenant, input.assetId);
    if (existing === null) {
      throw new NotFoundError({ resource: "asset", id: input.assetId });
    }

    if (existing.status !== "pending") {
      throw new ValidationError({ message: `Asset is already ${existing.status}` });
    }

    const head = await scoped.ports.files.headObject(existing.storageKey);
    if (head === undefined) {
      throw new ValidationError({ message: "Uploaded object not found in storage" });
    }

    if (head.contentType !== undefined && head.contentType !== existing.contentType) {
      throw new ValidationError({
        message: `Content type mismatch: expected ${existing.contentType}, got ${head.contentType}`,
      });
    }

    if (head.contentLength !== undefined) {
      if (head.contentLength > MAX_UPLOAD_BYTES) {
        throw new ValidationError({ message: "Uploaded object exceeds maximum size" });
      }
      if (existing.sizeBytes !== null && head.contentLength !== existing.sizeBytes) {
        throw new ValidationError({
          message: `Size mismatch: expected ${String(existing.sizeBytes)}, got ${String(head.contentLength)}`,
        });
      }
    }

    const outboxId = scoped.ports.ids.outboxId();
    const event = assetConfirmedEvent(
      {
        assetId: existing.id,
        organizationId: existing.organizationId,
        outboxId,
      },
      scoped.ports.clock.now(),
    );

    await writeOutboxEvent({
      db: tx,
      id: outboxId,
      organizationId: scoped.actor.organizationId,
      eventType: ASSET_CONFIRMED,
      payload: { ...event.payload },
    });

    await scoped.ports.events.emit(event);

    return toAssetDto(existing);
  });
}

export async function markAssetReady(ctx: Ctx, assetId: AssetId): Promise<ConfirmUploadOutput> {
  authorize(ctx.actor, PERMISSIONS["asset:create"], {
    organizationId: ctx.actor.organizationId,
  });

  const updated = await updateAssetStatus(tenantCtx(ctx), assetId, "ready");
  if (updated === null) {
    throw new NotFoundError({ resource: "asset", id: assetId });
  }

  return toAssetDto(updated);
}

export async function markAssetFailed(ctx: Ctx, assetId: AssetId): Promise<ConfirmUploadOutput> {
  authorize(ctx.actor, PERMISSIONS["asset:create"], {
    organizationId: ctx.actor.organizationId,
  });

  const updated = await updateAssetStatus(tenantCtx(ctx), assetId, "failed");
  if (updated === null) {
    throw new NotFoundError({ resource: "asset", id: assetId });
  }

  return toAssetDto(updated);
}

/** Nightly schedule target: fail pending uploads that were never confirmed. */
export async function reconcileOrphanAssets(
  ctx: Ctx,
  olderThan: Date,
  limit = 100,
): Promise<{ failed: number }> {
  if (!ctx.actor.isSystem) {
    authorize(ctx.actor, PERMISSIONS["asset:create"], {
      organizationId: ctx.actor.organizationId,
    });
  }

  const stale = await listStalePendingAssets(ctx.tx ?? ctx.db, olderThan, limit);
  let failed = 0;

  for (const row of stale) {
    const orgScoped: Ctx = {
      ...ctx,
      actor: {
        ...ctx.actor,
        organizationId: brandOrganizationId(row.organizationId),
        isSystem: true,
      },
    };
    const updated = await updateAssetStatus(
      {
        organizationId: brandOrganizationId(row.organizationId),
        db: orgScoped.tx ?? orgScoped.db,
      },
      brandAssetId(row.id),
      "failed",
    );
    if (updated !== null) {
      failed += 1;
    }
  }

  return { failed };
}
