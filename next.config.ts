import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Local development workaround only; does not affect production output.
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    // Keep Next image optimization enabled. Individual exceptional images can
    // opt out at component level rather than disabling optimization platform-wide.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.cloudflarestorage.com" },
      ...(process.env.R2_PUBLIC_URL
        ? (() => {
            try {
              const host = new URL(process.env.R2_PUBLIC_URL).hostname;
              return host ? [{ protocol: "https" as const, hostname: host }] : [];
            } catch {
              return [];
            }
          })()
        : []),
    ],
  },
  async rewrites() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        destination: "/api/firebase-messaging-sw",
      },
    ];
  },
  async headers() {
    const baseline = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(self)" },
      ...(process.env.NODE_ENV === "production"
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
        : []),
    ];

    return [
      { source: "/:path*", headers: baseline },
      {
        source: "/firebase-messaging-sw.js",
        headers: [
          ...baseline,
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
