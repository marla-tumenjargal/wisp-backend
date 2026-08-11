import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.are.na" },
      { protocol: "https", hostname: "d2w9rnfcy7mm78.cloudfront.net" },
    ],
  },
};

export default nextConfig;
