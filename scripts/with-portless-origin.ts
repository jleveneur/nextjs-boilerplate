/**
 * Local-dev helper: copy Portless's public URL onto origin vars, then exec.
 *
 * `portless` injects `PORTLESS_URL`, `PORT`, and `HOST` into its child. Next
 * inlines `NEXT_PUBLIC_*` from the process environment, and Better Auth reads
 * `BETTER_AUTH_URL`, so those names must actually be set before the framework
 * starts — a remap inside `createEnv` is too late for the client bundle.
 *
 * When Portless is skipped (`PORTLESS=0`) this is a no-op aside from
 * `--default-port`, which keeps docs on 3003 so it does not collide with web.
 *
 * Usage:
 *   node --experimental-strip-types scripts/with-portless-origin.ts next dev
 *   node --experimental-strip-types scripts/with-portless-origin.ts --default-port 3003 -- next dev
 */

import { spawn } from "node:child_process";

const ORIGIN_KEYS = ["APP_URL", "NEXT_PUBLIC_APP_URL", "BETTER_AUTH_URL"] as const;

export type PortlessOriginArgs = {
  defaultPort: string | undefined;
  command: string;
  args: string[];
};

export function parsePortlessOriginArgs(argv: readonly string[]): PortlessOriginArgs {
  let defaultPort: string | undefined;
  const commandArgs: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--default-port") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--default-port requires a port number");
      }
      defaultPort = value;
      index += 1;
      continue;
    }
    if (token === "--") {
      commandArgs.push(...argv.slice(index + 1));
      break;
    }
    if (token !== undefined) {
      commandArgs.push(token);
    }
  }

  const command = commandArgs[0];
  if (command === undefined) {
    throw new Error("with-portless-origin: missing command to exec");
  }

  return { defaultPort, command, args: commandArgs.slice(1) };
}

export function applyPortlessOrigin(env: NodeJS.ProcessEnv): void {
  const origin = env["PORTLESS_URL"];
  if (origin === undefined || origin.length === 0) {
    return;
  }
  for (const key of ORIGIN_KEYS) {
    env[key] = origin;
  }
}

export function applyDefaultPort(env: NodeJS.ProcessEnv, defaultPort: string | undefined): void {
  if (defaultPort === undefined) {
    return;
  }
  const current = env["PORT"];
  if (current === undefined || current.length === 0) {
    env["PORT"] = defaultPort;
  }
}

function run(): void {
  let parsed: PortlessOriginArgs;
  try {
    parsed = parsePortlessOriginArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid arguments";
    console.error(message);
    process.exit(1);
  }

  applyPortlessOrigin(process.env);
  applyDefaultPort(process.env, parsed.defaultPort);

  const child = spawn(parsed.command, parsed.args, {
    stdio: "inherit",
    env: process.env,
  });

  const forward = (signal: NodeJS.Signals): void => {
    child.kill(signal);
  };
  process.on("SIGINT", () => {
    forward("SIGINT");
  });
  process.on("SIGTERM", () => {
    forward("SIGTERM");
  });

  child.on("exit", (code, signal) => {
    if (signal !== null) {
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
}

if (import.meta.main) {
  run();
}
