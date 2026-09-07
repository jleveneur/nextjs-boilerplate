/**
 * Asset upload transport — thin wrappers over `@repo/assets` services.
 */

import { confirmUpload, requestUpload } from "@repo/assets";
import {
  assetSchema,
  confirmUploadInputSchema,
  requestUploadInputSchema,
  requestUploadOutputSchema,
} from "@repo/contracts";

import { orgProcedure } from "../procedures.ts";

export const assetsRouter = {
  requestUpload: orgProcedure
    .input(requestUploadInputSchema)
    .output(requestUploadOutputSchema)
    .handler(({ context, input }) => requestUpload(context.serviceCtx, input)),

  confirmUpload: orgProcedure
    .input(confirmUploadInputSchema)
    .output(assetSchema)
    .handler(({ context, input }) => confirmUpload(context.serviceCtx, input)),
};
