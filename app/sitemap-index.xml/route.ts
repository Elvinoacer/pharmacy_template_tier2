import { platform } from "@/app/lib/data";
import { discoverySitemapKeys, escapeXml } from "@/app/lib/services/discovery-sitemap";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const keys = await discoverySitemapKeys();
    const urls = [`${platform.siteUrl}/sitemap.xml`, ...keys.map(key => `${platform.siteUrl}/discovery-sitemaps/${key}`)];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join("")}</sitemapindex>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch {
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
  }
}
