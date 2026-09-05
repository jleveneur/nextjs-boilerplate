export type NextPublicProcessEnv = {
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_APP_ENV?: string;
  NEXT_PUBLIC_POSTHOG_KEY?: string;
  NEXT_PUBLIC_POSTHOG_HOST?: string;
  NEXT_PUBLIC_SENTRY_DSN?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
};

declare global {
  namespace NodeJS {
    interface ProcessEnv extends NextPublicProcessEnv {}
  }
}
