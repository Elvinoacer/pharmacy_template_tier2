import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve remote stock photos as-is so the browser loads them
    // (avoids server-side Unsplash fetch timeouts during image optimization).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
