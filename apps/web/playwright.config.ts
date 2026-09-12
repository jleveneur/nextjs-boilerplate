import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

// Same single `.env` the app and drizzle-kit read.
const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const PORT = 3111;
const baseURL = `http://127.0.0.1:${PORT}`;

/** Shared by the test process and the server it starts, so both read one outbox. */
const outboxDirectory = fileURLToPath(new URL("./.mail-e2e", import.meta.url));

export const E2E = { baseURL, outboxDirectory };

export default defineConfig({
  testDir: "./e2e",
  // Each spec signs up its own users, but they share one database, so parallel
  // files would race on the organization a session resolves to.
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env["CI"] !== undefined,
  retries: process.env["CI"] === undefined ? 0 : 1,
  reporter: process.env["CI"] === undefined ? "list" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL,
    trace: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    // The production build, not `next dev`: it is what CI ships, and dev-mode
    // recompilation makes the first navigation of every spec flaky.
    command: "pnpm build && pnpm start --port " + String(PORT),
    url: baseURL,
    reuseExistingServer: process.env["CI"] === undefined,
    timeout: 180_000,
    env: {
      BETTER_AUTH_URL: baseURL,
      MAIL_OUTBOX_DIR: outboxDirectory,
      // Deliberately blank: with no key the app writes mail to the outbox the
      // tests read. A real key here would send messages nothing can assert on.
      RESEND_API_KEY: "",
      // Every request in this suite comes from one address, which is exactly
      // what the limiter exists to stop. It stays on everywhere else.
      AUTH_RATE_LIMIT: "off",
    },
  },
});
