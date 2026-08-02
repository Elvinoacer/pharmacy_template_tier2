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
  // Serve the FCM service worker from an API route that injects Firebase env
  // config at runtime. Static /public SW files cannot read process.env.
  async rewrites() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        destination: "/api/firebase-messaging-sw",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
