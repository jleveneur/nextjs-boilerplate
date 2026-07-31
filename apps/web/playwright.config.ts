import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:3000";
const againstImage = process.env["E2E_AGAINST_IMAGE"] === "1";

const testEnv = {
  NODE_ENV: "production",
  APP_ENV: "test",
  APP_URL: baseURL,
  NEXT_PUBLIC_APP_URL: baseURL,
  NEXT_PUBLIC_APP_ENV: "test",
  LOG_LEVEL: "error",
  DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:55433/app_test",
  DATABASE_POOL_SIZE: "5",
  REDIS_URL: "redis://127.0.0.1:55435",
  BETTER_AUTH_SECRET: "dev-local-better-auth-secret-min-32-chars",
  BETTER_AUTH_URL: baseURL,
  EMAIL_FROM: "noreply@example.com",
  RESEND_API_KEY: "re_test_replace_me",
  SMTP_URL: "smtp://127.0.0.1:55441",
  MAILPIT_API_URL: "http://127.0.0.1:55442",
  S3_ENDPOINT: "http://127.0.0.1:55440",
  S3_REGION: "auto",
  S3_BUCKET: "app-test",
  S3_ACCESS_KEY_ID: "minioadmin",
  S3_SECRET_ACCESS_KEY: "minioadmin",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  // Image E2E boots Next from compose (make e2e); host path starts it here.
  ...(againstImage
    ? {}
    : {
        webServer: {
          command: "pnpm start",
          url: baseURL,
          reuseExistingServer: !process.env["CI"],
          timeout: 120_000,
          env: testEnv,
        },
      }),
});
