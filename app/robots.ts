import type { MetadataRoute } from "next";
import { pharmacy } from "./lib/data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${pharmacy.siteUrl}/sitemap.xml`,
  };
}
