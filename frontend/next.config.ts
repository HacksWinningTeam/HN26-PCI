import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,
  experimental: {
    proxyTimeout: 120_000,
  },
};

export default nextConfig;
