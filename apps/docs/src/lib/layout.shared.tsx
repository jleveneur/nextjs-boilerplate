import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Repo Docs",
    },
    links: [
      {
        text: "API reference",
        url: "/api-reference",
        active: "nested-url",
      },
    ],
  };
}
