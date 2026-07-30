/**
 * Central redaction paths for Pino.
 *
 * Per-call-site discipline fails eventually; listing paths once here means a
 * forgotten `password` in a log object is still redacted.
 */

/** Paths passed to Pino's `redact.paths`. Dot notation covers nested objects. */
export const REDACT_PATHS = [
  "password",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apiKey",
  "api_key",
  "cardNumber",
  "card_number",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "idToken",
  "id_token",
  "*.password",
  "*.token",
  "*.authorization",
  "*.cookie",
  "*.secret",
  "*.apiKey",
  "*.api_key",
  "*.cardNumber",
  "*.card_number",
  "*.accessToken",
  "*.access_token",
  "*.refreshToken",
  "*.refresh_token",
  "headers.authorization",
  "headers.cookie",
  "req.headers.authorization",
  "req.headers.cookie",
] as const;
