/** Feature-flag lookup. Real providers arrive with `@repo/flags` (Phase 14). */
export type FlagContext = {
  distinctId?: string;
  properties?: Record<string, string>;
};

export type FlagProvider = {
  isEnabled(flag: string, context?: FlagContext): Promise<boolean>;
};
