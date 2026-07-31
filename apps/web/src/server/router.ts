/**
 * App router composition root.
 *
 * The merged router lives in `@repo/trpc` (`appRouter`); this module is the
 * documented web-side import point so feature routers stay out of `apps/web`
 * until a second transport needs a different merge.
 */

export { appRouter } from "@repo/trpc";
