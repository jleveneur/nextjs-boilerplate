/**
 * Composable, fail-fast environment validation.
 *
 * Hand-rolled rather than `@t3-oss/env-nextjs`: roughly 80 lines of Zod, and we
 * need per-app preset composition, a build-time skip, and production refinements
 * that a general-purpose library makes awkward. See
 * docs/architecture/09-environment-and-secrets.md.
 *
 * This is the **only** module in the repository that reads `process.env`.
 * Everywhere else imports a typed `env` object an app created with this function.
 */

import { z, type output } from "zod";

import { crossFieldProblems } from "./cross-field.ts";
import { formatEnvErrors } from "./format-errors.ts";
import { mergePresets, type Preset } from "./merge-presets.ts";
import { productionProblems } from "./production.ts";

const CLIENT_PREFIX = "NEXT_PUBLIC_";

export type RuntimeEnv = Readonly<Record<string, string | undefined>>;

/**
 * Infers the merged output type of one preset, a tuple of presets, or nothing.
 *
 * Tuple form is what apps write (`server: [base, db, redis]`): each element's
 * fields become required properties on the result. A bare `Preset[]` (non-tuple)
 * cannot be inferred field-by-field and collapses to a wide record — pass a
 * tuple, or wrap with {@link combine}, when you want precise keys.
 */
export type InferPresets<T> = T extends undefined
  ? Record<string, never>
  : T extends Preset
    ? output<T>
    : T extends readonly [infer Head, ...infer Tail]
      ? Head extends Preset
        ? output<Head> & InferPresets<Tail>
        : Record<string, never>
      : Record<string, never>;

export type CreateEnvOptions<
  TServer extends Preset | readonly Preset[] | undefined = undefined,
  TClient extends Preset | readonly Preset[] | undefined = undefined,
> = {
  /** Server-only presets. Merged in order; later entries win on key collisions. */
  server?: TServer;
  /**
   * Client presets. Every key must be `NEXT_PUBLIC_`-prefixed — enforced here,
   * not by convention.
   */
  client?: TClient;
  /**
   * Values to validate.
   *
   * Defaults to `process.env` on the server. **Required on the client**: Next.js
   * inlines only static `process.env.NEXT_PUBLIC_*` accesses, so a dynamic lookup
   * by key would see `undefined` for every public variable after the build.
   */
  runtimeEnv?: RuntimeEnv;
  /**
   * Skip validation. Also honoured when `SKIP_ENV_VALIDATION=1`, which Docker
   * image builds set because runtime secrets are legitimately absent then.
   * Validation runs at container start instead.
   */
  skipValidation?: boolean;
  /**
   * Override the failure path. Defaults to throwing an `Error` whose message
   * lists every invalid variable. Tests use this to assert without try/catch.
   */
  onValidationError?: (message: string) => never;
};

export type EnvOf<T extends CreateEnvOptions> = InferPresets<T["server"]> &
  InferPresets<T["client"]>;

/**
 * Validates and returns a typed environment object.
 *
 * ```ts
 * // apps/worker
 * export const env = createEnv({
 *   server: [base, db, redis, s3, resend, otel],
 * });
 * env.DATABASE_URL; // string — not string | undefined
 * ```
 */
export function createEnv<
  const TServer extends Preset | readonly Preset[] | undefined = undefined,
  const TClient extends Preset | readonly Preset[] | undefined = undefined,
>(options: CreateEnvOptions<TServer, TClient>): InferPresets<TServer> & InferPresets<TClient> {
  const serverSchema = mergePresets(options.server);
  const clientSchema = mergePresets(options.client);

  assertClientKeysArePublic(clientSchema);

  const schema = z.object({
    ...serverSchema.shape,
    ...clientSchema.shape,
  });

  const runtimeEnv = options.runtimeEnv ?? readProcessEnv();
  const skip =
    options.skipValidation === true ||
    runtimeEnv["SKIP_ENV_VALIDATION"] === "1" ||
    runtimeEnv["SKIP_ENV_VALIDATION"] === "true";

  if (skip) {
    // Docker builds reach here with secrets absent. The cast is the cost of the
    // skip: callers that set SKIP_ENV_VALIDATION take responsibility for not
    // reading env until a later process start validates for real.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return runtimeEnv as InferPresets<TServer> & InferPresets<TClient>;
  }

  const parsed = schema.safeParse(pick(runtimeEnv, Object.keys(schema.shape)));

  if (!parsed.success) {
    fail(formatEnvErrors(parsed.error), options.onValidationError);
  }

  const data = parsed.data;

  const dependencyProblems = crossFieldProblems(data);
  if (dependencyProblems.length > 0) {
    fail(
      ["Invalid environment variables:", ...dependencyProblems.map((line) => `  ${line}`)].join(
        "\n",
      ),
      options.onValidationError,
    );
  }

  if (data["APP_ENV"] === "production") {
    const problems = productionProblems(data);
    if (problems.length > 0) {
      fail(
        [
          "Invalid environment variables for production:",
          ...problems.map((line) => `  ${line}`),
        ].join("\n"),
        options.onValidationError,
      );
    }
  }

  // Parsed output is validated against the merged schema; the cast reconnects it
  // to the tuple-inferred return type TypeScript cannot compute through z.object.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return data as InferPresets<TServer> & InferPresets<TClient>;
}

/**
 * Merges presets into one object schema.
 *
 * Prefer a tuple at the `createEnv` call site for precise key inference:
 * `createEnv({ server: [base, db, redis] })`. Use `combine` when you need a
 * named schema to pass around before calling `createEnv`.
 */
export function combine(...presets: Preset[]): Preset {
  return mergePresets(presets);
}

/**
 * Ensures every client-schema key is browser-safe.
 *
 * A secret landing in the client preset is unrecoverable once the bundle is
 * published, so this fails at module evaluation rather than waiting for a CI
 * grep to catch it.
 */
function assertClientKeysArePublic(clientSchema: Preset): void {
  const illegal = Object.keys(clientSchema.shape).filter((key) => !key.startsWith(CLIENT_PREFIX));

  if (illegal.length > 0) {
    throw new Error(
      `Client environment keys must start with "${CLIENT_PREFIX}". Offending key(s): ${illegal.join(", ")}`,
    );
  }
}

function pick(source: RuntimeEnv, keys: readonly string[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of keys) {
    out[key] = source[key];
  }
  return out;
}

/**
 * Reads `process.env`.
 *
 * Isolated so the rest of the file can be reasoned about without ambient access,
 * and so tests can assert this is the single read site by stubbing it through
 * `runtimeEnv` instead.
 */
function readProcessEnv(): RuntimeEnv {
  // This is the repository's sole authorised process.env access. Everywhere else
  // imports a typed `env` object.
  return process.env;
}

function fail(message: string, onValidationError: ((message: string) => never) | undefined): never {
  if (onValidationError !== undefined) {
    return onValidationError(message);
  }
  throw new Error(message);
}
