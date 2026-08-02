import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig({
  mdxOptions: {
    // Mermaid fences are rendered client-side via the MDX `pre` override.
    remarkPlugins: [],
  },
});
