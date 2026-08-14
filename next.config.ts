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
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "**.substack.com" },
      { protocol: "https", hostname: "substackcdn.com" },
      { protocol: "https", hostname: "**.substackcdn.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
