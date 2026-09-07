import { defineErrorCode, NotFoundError } from "@repo/errors";
import type { AssetId } from "@repo/types";

export const ASSET_ERROR_CODES = {
  DERIVATION_INPUT_MISSING: defineErrorCode("ASSET_DERIVATION_INPUT_MISSING"),
} as const;

/**
 * A required input to image derivation no longer exists.
 *
 * Workers may treat this as terminal: retrying cannot recreate either the asset
 * row or its original object.
 */
export class AssetDerivationInputMissingError extends NotFoundError {
  constructor(assetId: AssetId, input: "asset" | "source_object") {
    super({
      code: ASSET_ERROR_CODES.DERIVATION_INPUT_MISSING,
      resource: input === "asset" ? "asset" : "asset source object",
      id: assetId,
      context: { assetId, input },
    });
  }
}
