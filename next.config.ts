import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // An ancestor folder has its own package-lock.json, which Next otherwise
    // infers as the workspace root — watching it exhausts inotify watches.
    root: __dirname,
  },
  experimental: {
    // TEMPORARY: dev cache compaction stalls this machine; remove after debugging.
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    // Serve remote stock photos as-is so the browser loads them
    // (avoids server-side Unsplash fetch timeouts during image optimization).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Cloudflare R2 public bucket URLs (*.r2.dev and custom domains via env).
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.cloudflarestorage.com",
      },
      // Allow whatever host is set as R2_PUBLIC_URL (custom domain).
      ...(process.env.R2_PUBLIC_URL
        ? (() => {
            try {
              const host = new URL(process.env.R2_PUBLIC_URL).hostname;
              return host
                ? [{ protocol: "https" as const, hostname: host }]
                : [];
            } catch {
              return [];
            }
          })()
        : []),
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
