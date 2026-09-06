/** First-party PostHog rewrite — must not go through locale prefixing. */
export function isPostHogIngestPath(pathname: string): boolean {
  if (pathname === "/ingest" || pathname.startsWith("/ingest/")) {
    return true;
  }
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 2 && parts[1] === "ingest";
}
