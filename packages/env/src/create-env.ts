/**
 * Composable, fail-fast environment validation.
 *
 * Hand-rolled rather than `@t3-oss/env-nextjs`: roughly 80 lines of Zod, and we
 * need per-app preset composition, a build-time skip, and production refinements
 * that a general-purpose library makes awkward. See
 * docs/architecture/09-environment-and-secrets.md.
 *
 * This module provides the default server-side `process.env` reader. Apps
 * normally pass an explicit `runtimeEnv` object from their composition-root env
 * module; libraries consume the resulting typed object instead of ambient config.
 */

import { z, type output } from "zod";

import { emptyStringsToUndefined } from "./coerce.ts";
import { formatEnvErrors } from "./format-errors.ts";
import { collectPresetProblems, mergePresets, type Preset } from "./merge-presets.ts";
import { productionProblems } from "./production.ts";

const CLIENT_PREFIX = "NEXT_PUBLIC_";

export type RuntimeEnv = Readonly<Record<string, string | undefined>>;

type EmptyEnv = Record<never, never>;

/**
 * Infers the merged output type of one preset, a tuple of presets, or nothing.
 *
 * Tuple form is what apps write (`server: [base, db, redis]`): each element's
 * fields become required properties on the result. A bare `Preset[]` (non-tuple)
 * cannot be inferred field-by-field and collapses to {@link EmptyEnv} — pass a
 * tuple when you want precise keys.
 *
 * Empty-tuple / missing presets must not be `Record<string, never>`: that
 * widens `keyof` to `string` and breaks both exhaustive `runtimeEnv` and the
 * `NEXT_PUBLIC_` client-key check.
 */
export type InferPresets<T> = [T] extends [undefined]
  ? EmptyEnv
  : T extends readonly []
    ? EmptyEnv
    : T extends readonly [infer Head, ...infer Tail]
      ? Head extends Preset
        ? output<Head> & InferPresets<Tail>
        : EmptyEnv
      : T extends Preset
        ? output<T>
        : EmptyEnv;

type EnvKeys<TServer, TClient> = Extract<
  keyof InferPresets<TServer> | keyof InferPresets<TClient>,
  string
>;

/**
 * Raw string map for every key the composed schemas will read.
 *
 * Defaults and optionals still belong here: omitting a key is how a new preset
 * field silently takes its default. `SKIP_ENV_VALIDATION` is extra so Docker
 * image builds can opt out without putting that flag on a schema.
 */
export type RuntimeEnvFor<TServer, TClient> = {
  [K in EnvKeys<TServer, TClient>]: string | undefined;
} & {
  SKIP_ENV_VALIDATION?: string | undefined;
};

type OffendingClientKeys<T> = Exclude<
  Extract<keyof InferPresets<T>, string>,
  `NEXT_PUBLIC_${string}`
>;

type PublicClient<T> = [T] extends [undefined]
  ? T
  : [OffendingClientKeys<T>] extends [never]
    ? T
    : T & {
        readonly __clientPrefix: `Client environment keys must start with "${typeof CLIENT_PREFIX}". Offending: ${OffendingClientKeys<T>}`;
      };

type RuntimeEnvOption<TServer, TClient> = [TClient] extends [undefined]
  ? { runtimeEnv?: RuntimeEnvFor<TServer, TClient> }
  : { runtimeEnv: RuntimeEnvFor<TServer, TClient> };

export type CreateEnvOptions<
  TServer extends Preset | readonly Preset[] | undefined = undefined,
  TClient extends Preset | readonly Preset[] | undefined = undefined,
> = {
  /** Server-only presets. Merged in order; later entries win on key collisions. */
  server?: TServer;
  /**
   * Client presets. Every key must be `NEXT_PUBLIC_`-prefixed — enforced at the
   * type level and again at runtime.
   */
  client?: PublicClient<TClient>;
  /**
   * Skip validation. Also honoured when `SKIP_ENV_VALIDATION=1`, which Docker
   * image builds set because runtime secrets are legitimately absent then.
   * Validation runs at container start instead. Listed in `turbo.json` `build.env`
   * so remote cache cannot reuse an artifact built with a different skip flag.
   */
  skipValidation?: boolean;
  /**
   * Override the failure path. Defaults to throwing an `Error` whose message
   * lists every invalid variable. Tests use this to assert without try/catch.
   */
  onValidationError?: (message: string) => never;
} & RuntimeEnvOption<TServer, TClient>;

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
  const skip = shouldSkipValidation(options.skipValidation, runtimeEnv);
  const values = emptyStringsToUndefined(pick(runtimeEnv, Object.keys(schema.shape)));

  if (skip) {
    // Docker builds reach here with secrets absent. The cast is the cost of the
    // skip: callers that set SKIP_ENV_VALIDATION take responsibility for not
    // reading env until a later process start validates for real.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return values as InferPresets<TServer> & InferPresets<TClient>;
  }

  const parsed = schema.safeParse(values);

  if (!parsed.success) {
    fail(formatEnvErrors(parsed.error), options.onValidationError);
  }

  const data = parsed.data;

  const dependencyProblems = uniqueSorted(
    [...collectPresetProblems(options.server), ...collectPresetProblems(options.client)].flatMap(
      (problems) => problems(data),
    ),
  );
  if (dependencyProblems.length > 0) {
    fail(
      ["Invalid environment variables:", ...dependencyProblems.map((line) => `  ${line}`)].join(
        "\n",
      ),
      options.onValidationError,
    );
  }

  const liveProblems = productionProblems(data);
  if (liveProblems.length > 0) {
    const appEnv = data["APP_ENV"] === "staging" ? "staging" : "production";
    fail(
      [
        `Invalid environment variables for ${appEnv}:`,
        ...liveProblems.map((line) => `  ${line}`),
      ].join("\n"),
      options.onValidationError,
    );
  }

  // Parsed output is validated against the merged schema; the cast reconnects it
  // to the tuple-inferred return type TypeScript cannot compute through z.object.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return data as InferPresets<TServer> & InferPresets<TClient>;
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

function shouldSkipValidation(
  skipValidation: boolean | undefined,
  runtimeEnv: RuntimeEnv,
): boolean {
  if (skipValidation === true) return true;
  const flag = runtimeEnv["SKIP_ENV_VALIDATION"] ?? process.env["SKIP_ENV_VALIDATION"];
  return flag === "1" || flag === "true";
}

function uniqueSorted(lines: readonly string[]): string[] {
  return [...new Set(lines)].toSorted();
}

/**
 * Reads `process.env`.
 *
 * Isolated so the rest of the file can be reasoned about without ambient access,
 * and so tests can avoid ambient state by supplying `runtimeEnv` instead.
 */
function readProcessEnv(): RuntimeEnv {
  // Server-side convenience fallback. App composition roots normally provide
  // an explicit runtimeEnv object so their accepted keys remain visible.
  return process.env;
}

function fail(message: string, onValidationError: ((message: string) => never) | undefined): never {
  if (onValidationError !== undefined) {
    return onValidationError(message);
  }
  throw new Error(message);
}
