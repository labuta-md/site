import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Pet photos are uploaded through forms; allow up to 5 MB plus form overhead.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
