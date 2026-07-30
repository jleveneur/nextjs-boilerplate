/** Feature-flag lookup. Real providers arrive with `@repo/flags` (Phase 14). */
export type FlagProvider = {
  isEnabled(flag: string, context?: Record<string, string>): Promise<boolean>;
};
