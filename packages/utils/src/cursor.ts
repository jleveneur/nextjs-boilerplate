/**
 * Opaque pagination cursors.
 *
 * A cursor carries the position of the last row a client received, so the next
 * page is a `WHERE` clause rather than an `OFFSET`. Offset pagination repeats and
 * skips rows whenever anything is inserted or deleted between requests, which on a
 * busy list is most requests.
 *
 * ## Opaque, and why that is enforced by encoding rather than by documentation
 *
 * The encoded form is base64url of JSON — obfuscation, not protection. Its purpose
 * is to stop clients reading the shape and building their own, because a cursor
 * that clients construct is a public API contract that can never be changed. Any
 * client that base64-decodes one and depends on the contents has opted out of that
 * guarantee, and the next change to the sort key will break them.
 *
 * ## Signing
 *
 * The public API contract specifies signed cursors, and these are not signed. A
 * signature needs a secret, and this package may not read configuration, perform
 * I/O, or import `@repo/env` — nor can it, being layer 0 and browser-safe. So the
 * split is: this module owns the encoding, and the API layer wraps it with an HMAC
 * where a key is actually available.
 *
 * Until that wrapper exists, treat a decoded payload as **untrusted client input**:
 * validate it with the same rigour as a query parameter, and scope every value in
 * it to the caller's organisation. An unsigned cursor is a tampering vector
 * precisely because the values inside reach a `WHERE` clause.
 */

/** Anything `JSON.stringify` round-trips without loss. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/** The base64url alphabet, unpadded. Anything else is not a cursor we produced. */
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Encodes a pagination position as an opaque cursor string.
 *
 * Safe in a URL and in a JSON body without further escaping: the output uses
 * base64url and carries no padding, so there is no `+`, `/`, or `=` to encode.
 *
 * @throws TypeError if `payload` contains a circular reference or a `BigInt`,
 *   which `JSON.stringify` cannot represent.
 */
export function encodeCursor(payload: JsonValue): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

/**
 * Decodes a cursor, or returns `undefined` if it is not a cursor.
 *
 * Cursors arrive from clients, so malformed input is expected traffic rather than a
 * bug — hence a return value instead of a throw. **Reject the request when this
 * returns `undefined`.** Silently falling back to the first page is the tempting
 * alternative and a real bug: the client believes it is advancing while being
 * served page one forever, and an importer built on it duplicates every row.
 *
 * The payload is `unknown`, not a caller-supplied generic and not `JsonValue`. A
 * generic here would be a cast wearing a costume: the bytes came from outside the
 * process and nothing has checked their shape. Validate with the Zod schema in
 * `@repo/contracts` before reading any field.
 *
 * `undefined` unambiguously means failure, even though the success type is
 * `unknown`, because JSON has no way to represent `undefined` — a successful decode
 * cannot produce it.
 */
export function decodeCursor(cursor: string): unknown {
  // Checked before decoding: `atob` accepts standard base64, so without this a
  // cursor containing `+` or `/` would decode. Accepting a form we never emit
  // gives clients a second, undocumented cursor format to depend on.
  if (!BASE64_URL_PATTERN.test(cursor)) return undefined;

  const base64 = cursor.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    return undefined;
  }

  // `charCodeAt` rather than `codePointAt`: `atob` returns one character per byte,
  // each below 256, and this needs the UTF-16 code unit rather than a code point
  // that could combine a surrogate pair into one value. It is also typed as
  // returning `number` instead of `number | undefined`, so there is no unreachable
  // fallback branch here that no test could ever cover.
  // oxlint-disable-next-line unicorn/prefer-code-point
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  try {
    // `fatal` so invalid UTF-8 is rejected rather than replaced with U+FFFD.
    // Without it, arbitrary bytes decode to a string of replacement characters,
    // and a cursor that is not text at all can still parse as JSON.
    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    // No assertion on the result. `JSON.parse` is typed as returning `any`, which
    // would spread silently through every caller; returning it as `unknown` forces
    // the validation that has to happen anyway at a trust boundary.
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}
