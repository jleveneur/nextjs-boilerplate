"use client";

/**
 * The last resort: an error in the root layout itself.
 *
 * This replaces the whole document, so it has to render `<html>` and `<body>`
 * — and it cannot use anything the broken layout provides, which is why the
 * styling is inline rather than from the design system.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          margin: 0,
        }}
      >
        <main style={{ textAlign: "center", padding: "24px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ fontSize: "14px", color: "#666" }}>
            {error.digest === undefined ? "Try again in a moment." : `Reference: ${error.digest}`}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "16px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
