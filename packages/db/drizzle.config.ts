import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig } from "drizzle-kit";

// The workspace keeps one `.env` at the repository root. Node reads it natively;
// in CI and production the variables are already set, so the file is absent and
// this is a no-op.
const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    /**
     * A getter, not a value.
     *
     * drizzle-kit reads this only when it is about to connect, so the helpful
     * message still reaches anyone who forgot the `.env`. Throwing while the
     * module is merely imported would break every tool that loads config files
     * to understand the project — Knip does exactly that, and because it kept
     * exiting zero the failure hid behind a green check.
     */
    get url(): string {
      const value = process.env["DATABASE_URL"];

      if (value === undefined || value === "") {
        throw new Error(
          "DATABASE_URL is required. Copy .env.example to .env at the repository root.",
        );
      }

      return value;
    },
  },
});
