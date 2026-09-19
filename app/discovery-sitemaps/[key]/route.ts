import { discoverySitemapPage, escapeXml } from "@/app/lib/services/discovery-sitemap";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const match = /^(pharmacies|medicines|services)-(0|[1-9]\d{0,5})\.xml$/.exec(key);
  if (!match) return new Response("Not found", { status: 404 });
  try {
    const entries = await discoverySitemapPage(match[1], Number(match[2]));
    if (!entries.length) return new Response("Not found", { status: 404 });
    const body = entries.map(e => `<url><loc>${escapeXml(e.url)}</loc>${e.lastModified ? `<lastmod>${new Date(e.lastModified).toISOString()}</lastmod>` : ""}</url>`).join("");
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=3600" } });
  } catch {
    return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Retry-After": "300" } });
  }
}
