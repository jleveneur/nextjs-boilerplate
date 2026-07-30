import { billingRouter } from "./routers/billing.ts";
import { createTRPCRouter } from "./trpc.ts";

/** Merged app router — apps mount this (Phase 8) or call via `createCaller`. */
export const appRouter = createTRPCRouter({
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
