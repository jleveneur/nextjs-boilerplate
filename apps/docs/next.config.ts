import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@repo/env", "fumadocs-mdx", "fumadocs-ui", "fumadocs-core"],
  experimental: {
    useTypeScriptCli: true,
  },
};

export default withMDX(nextConfig);
