import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit reads DATABASE_URL from the environment. Migrations are generated
 * and reviewed as SQL in `migrations/`; this file is only for the CLI.
 */
export default defineConfig({
  schema: "./src/schema/*.sql.ts",
  out: "./migrations",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    // Validated by seed/migrate scripts; the kit only needs a string here.
    url: process.env["DATABASE_URL"] ?? "postgres://postgres:postgres@127.0.0.1:55432/app",
  },
});
