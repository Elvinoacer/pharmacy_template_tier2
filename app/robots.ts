import type { MetadataRoute } from "next";
import { platform } from "./lib/data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/admin/",
        "/portal",
        "/portal/",
        "/caregiver",
        "/caregiver/",
        "/platform",
        "/platform/",
        "/onboard",
        "/onboard/",
        "/select-pharmacy",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: [
      `${platform.siteUrl}/sitemap-index.xml`,
      `${platform.siteUrl}/sitemap.xml`,
    ],
  };
}
