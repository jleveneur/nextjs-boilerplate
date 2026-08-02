// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export { resolveFlag } from "./evaluate.ts";
export { createEnvFlagProvider, type CreateEnvFlagProviderOptions } from "./env-provider.ts";
export { listExpiredFlags, type ExpiredFlag } from "./expiry.ts";
export {
  createPostHogFlagProvider,
  type CreatePostHogFlagProviderOptions,
} from "./posthog-provider.ts";
export { createStaticFlagProvider } from "./static-provider.ts";
export { getFlagDefinition, hasFlagName, type FlagName } from "./registry.ts";
export type { FlagContext, FlagProvider } from "./types.ts";
