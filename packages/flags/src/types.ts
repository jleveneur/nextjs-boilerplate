/**
 * Feature-flag provider port.
 */

export type FlagContext = {
  /** Distinct id for percentage rollouts / cohort targeting (PostHog). */
  distinctId?: string;
  /** Person properties forwarded to PostHog flag evaluation. */
  properties?: Record<string, string>;
};

export type FlagProvider = {
  isEnabled(flag: string, context?: FlagContext): Promise<boolean>;
};
