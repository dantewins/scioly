import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: false,
  experimental: {
    // Avoid noisy/dev-hostile write-batch contention from turbopack FS persistence.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
