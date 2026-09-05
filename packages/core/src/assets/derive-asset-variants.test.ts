import { permissionsForRole } from "@repo/authz";
import { findAssetById, updateAssetStatus, type AssetRow } from "@repo/db";
import type * as DbModule from "@repo/db";
import { ForbiddenError } from "@repo/errors";
import { derivativeObjectKey } from "@repo/storage";
import { deriveImageVariants } from "@repo/storage/image";
import type * as StorageImageModule from "@repo/storage/image";
import type { Actor, AssetId, OrganizationId, UserId } from "@repo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Ctx } from "../ctx.ts";
import { createTestPorts } from "../testing/create-test-ports.ts";
import { AssetDerivationInputMissingError } from "./asset.errors.ts";
import { deriveAssetVariants } from "./derive-asset-variants.ts";

vi.mock("@repo/db", async (importOriginal) => {
  const actual = await importOriginal<typeof DbModule>();
  return {
    ...actual,
    findAssetById: vi.fn(),
    updateAssetStatus: vi.fn(),
  };
});

vi.mock("@repo/storage/image", async (importOriginal) => {
  const actual = await importOriginal<typeof StorageImageModule>();
  return {
    ...actual,
    deriveImageVariants: vi.fn(),
  };
});

function brandAssetId(id: string): AssetId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as AssetId;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as OrganizationId;
}

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as UserId;
}

const ORGANIZATION_ID = brandOrganizationId("01900000-0000-7000-8000-000000000001");
const USER_ID = brandUserId("01900000-0000-7000-8000-000000000002");
const ASSET_ID = brandAssetId("01900000-0000-7000-8000-000000000003");

function makeActor(overrides: Partial<Actor> = {}): Actor {
  return {
    userId: USER_ID,
    organizationId: ORGANIZATION_ID,
    role: "owner",
    permissions: permissionsForRole("owner"),
    isSystem: true,
    ...overrides,
  };
}

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test logger
const silentLogger = {
  debug: () => undefined,
  info: vi.fn(),
  warn: () => undefined,
  error: () => undefined,
  child: () => silentLogger,
} as unknown as Ctx["logger"];

function makeCtx(actor: Actor = makeActor()): Ctx {
  return {
    actor,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- repository is mocked
    db: {} as Ctx["db"],
    logger: silentLogger,
    ports: createTestPorts(),
  };
}

function makeAsset(status: AssetRow["status"] = "pending"): AssetRow {
  return {
    id: ASSET_ID,
    organizationId: ORGANIZATION_ID,
    ownerUserId: USER_ID,
    status,
    storageKey: "test/org/asset/id/photo.png",
    contentType: "image/png",
    sizeBytes: 4,
    originalFilename: "photo.png",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  };
}

describe("deriveAssetVariants", () => {
  beforeEach(() => {
    vi.mocked(findAssetById).mockReset();
    vi.mocked(updateAssetStatus).mockReset();
    vi.mocked(deriveImageVariants).mockReset();
    vi.mocked(silentLogger.info).mockClear();

    vi.mocked(updateAssetStatus).mockImplementation((_ctx, _assetId, status) =>
      Promise.resolve(makeAsset(status)),
    );
    vi.mocked(deriveImageVariants).mockResolvedValue({
      webp: { body: Uint8Array.from([1]), contentType: "image/webp" },
      avif: { body: Uint8Array.from([2]), contentType: "image/avif" },
    });
  });

  it("derives and stores variants for a system actor", async () => {
    const ctx = makeCtx(makeActor({ permissions: [] }));
    const row = makeAsset();
    vi.mocked(findAssetById).mockResolvedValue(row);
    await ctx.ports.files.putObject({
      key: row.storageKey,
      body: Uint8Array.from([0, 1, 2, 3]),
      contentType: row.contentType,
    });

    await expect(deriveAssetVariants(ctx, { assetId: ASSET_ID })).resolves.toBeUndefined();

    expect(findAssetById).toHaveBeenCalledWith(
      { organizationId: ORGANIZATION_ID, db: ctx.db },
      ASSET_ID,
    );
    expect(deriveImageVariants).toHaveBeenCalledWith(Uint8Array.from([0, 1, 2, 3]));
    await expect(
      ctx.ports.files.getObject(derivativeObjectKey(row.storageKey, "webp")),
    ).resolves.toEqual(Uint8Array.from([1]));
    await expect(
      ctx.ports.files.getObject(derivativeObjectKey(row.storageKey, "avif")),
    ).resolves.toEqual(Uint8Array.from([2]));
    expect(updateAssetStatus).toHaveBeenCalledWith(
      { organizationId: ORGANIZATION_ID, db: ctx.db },
      ASSET_ID,
      "ready",
    );
  });

  it("returns without reading storage when the asset is already ready", async () => {
    const ctx = makeCtx();
    vi.mocked(findAssetById).mockResolvedValue(makeAsset("ready"));

    await expect(deriveAssetVariants(ctx, { assetId: ASSET_ID })).resolves.toBeUndefined();

    expect(deriveImageVariants).not.toHaveBeenCalled();
    expect(updateAssetStatus).not.toHaveBeenCalled();
  });

  it("throws a terminal-friendly typed error when the asset is missing", async () => {
    const ctx = makeCtx();
    vi.mocked(findAssetById).mockResolvedValue(null);

    await expect(deriveAssetVariants(ctx, { assetId: ASSET_ID })).rejects.toBeInstanceOf(
      AssetDerivationInputMissingError,
    );
    expect(updateAssetStatus).not.toHaveBeenCalled();
  });

  it("marks the asset failed when the source object is missing", async () => {
    const ctx = makeCtx();
    vi.mocked(findAssetById).mockResolvedValue(makeAsset());

    await expect(deriveAssetVariants(ctx, { assetId: ASSET_ID })).rejects.toMatchObject({
      name: "AssetDerivationInputMissingError",
      context: { assetId: ASSET_ID, input: "source_object" },
    });
    expect(updateAssetStatus).toHaveBeenCalledWith(
      { organizationId: ORGANIZATION_ID, db: ctx.db },
      ASSET_ID,
      "failed",
    );
  });

  it("marks the asset failed and preserves retryable derivation errors", async () => {
    const ctx = makeCtx();
    const row = makeAsset();
    const derivationError = new Error("image decoder unavailable");
    vi.mocked(findAssetById).mockResolvedValue(row);
    vi.mocked(deriveImageVariants).mockRejectedValue(derivationError);
    await ctx.ports.files.putObject({
      key: row.storageKey,
      body: Uint8Array.from([0]),
      contentType: row.contentType,
    });

    await expect(deriveAssetVariants(ctx, { assetId: ASSET_ID })).rejects.toBe(derivationError);
    expect(updateAssetStatus).toHaveBeenCalledWith(
      { organizationId: ORGANIZATION_ID, db: ctx.db },
      ASSET_ID,
      "failed",
    );
  });

  it("authorizes before loading the asset", async () => {
    const ctx = makeCtx(makeActor({ isSystem: false, permissions: [] }));

    await expect(deriveAssetVariants(ctx, { assetId: ASSET_ID })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(findAssetById).not.toHaveBeenCalled();
  });
});
