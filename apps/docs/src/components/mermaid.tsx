"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * Client-side Mermaid renderer for fenced ` ```mermaid ` blocks in architecture docs.
 */
export function Mermaid({ chart }: { chart: string }): ReactNode {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "neutral",
      });
      const { svg: rendered } = await mermaid.render(`mermaid-${id}`, chart);
      if (!cancelled) {
        setSvg(rendered);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (svg === "") {
    return (
      <pre className="bg-fd-secondary text-fd-secondary-foreground overflow-x-auto rounded-lg p-4 text-sm">
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <div
      className="bg-fd-card my-4 overflow-x-auto rounded-lg border p-4"
      // Mermaid emits trusted SVG from our own markdown sources.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
