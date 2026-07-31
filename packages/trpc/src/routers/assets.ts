/**
 * Asset upload transport — thin wrappers over `@repo/core` services.
 */

import {
  confirmUploadInputSchema,
  confirmUploadOutputSchema,
  requestUploadInputSchema,
  requestUploadOutputSchema,
} from "@repo/contracts";
import { confirmUpload, requestUpload } from "@repo/core";

import { createTRPCRouter, orgProcedure } from "../trpc.ts";

export const assetsRouter = createTRPCRouter({
  requestUpload: orgProcedure
    .input(requestUploadInputSchema)
    .output(requestUploadOutputSchema)
    .mutation(({ ctx, input }) => requestUpload(ctx.serviceCtx, input)),

  confirmUpload: orgProcedure
    .input(confirmUploadInputSchema)
    .output(confirmUploadOutputSchema)
    .mutation(({ ctx, input }) => confirmUpload(ctx.serviceCtx, input)),
});
