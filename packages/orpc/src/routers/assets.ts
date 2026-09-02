/**
 * Asset upload transport — thin wrappers over `@repo/core` services.
 */

import {
  assetSchema,
  confirmUploadInputSchema,
  requestUploadInputSchema,
  requestUploadOutputSchema,
} from "@repo/contracts";
import { confirmUpload, requestUpload } from "@repo/core";

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
