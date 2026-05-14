import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: false,
  images: {
    // Allow the higher-quality variants we use for the marketing hero image.
    qualities: [75, 95],
  },
  experimental: {
    // Avoid noisy/dev-hostile write-batch contention from turbopack FS persistence.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
