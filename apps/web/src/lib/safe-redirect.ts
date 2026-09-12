/**
 * Narrows a caller-supplied redirect target to a path on this site.
 *
 * `?next=` comes from the URL, so it is attacker-controlled. Anything that is
 * not a plain absolute path is discarded — including `//evil.example`, which a
 * browser reads as a protocol-relative URL and would happily follow off-site.
 */
export function safeRedirect(target: string | undefined, fallback: string): string {
  if (target === undefined || !target.startsWith("/") || target.startsWith("//")) {
    return fallback;
  }

  return target;
}
