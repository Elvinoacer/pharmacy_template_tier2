import test from "node:test";
import assert from "node:assert/strict";
import { serializeJsonLd, locationPath, uniqueSitemapEntries } from "../app/lib/seo";
import { VACCINE_CATALOG } from "../app/lib/vaccination-catalog";

test("pharmacy-controlled structured data cannot terminate the script element", () => {
  const data = { name: '</script><script>alert("x")</script>', city: "A&B" };
  const serialized = serializeJsonLd(data);
  assert.equal(serialized.includes("<"), false);
  assert.deepEqual(JSON.parse(serialized), data);
});
test("location URLs encode punctuation and normalize letter case", () => {
  assert.equal(locationPath(" Nairobi "), "/locations/nairobi");
  assert.equal(locationPath("Murang'a / Town?"), "/locations/murang'a%20%2F%20town%3F");
});
test("duplicate sitemap URLs retain the latest real modification date regardless of input order", () => {
  const old = { url: "/medicine", lastModified: new Date("2025-01-01") };
  const recent = { url: "/medicine", lastModified: new Date("2026-01-01") };
  const other = { url: "/pharmacy" };
  assert.deepEqual(uniqueSitemapEntries([old, recent, other]), [recent, other]);
  assert.deepEqual(uniqueSitemapEntries([recent, old]), [recent]);
});


test("global vaccine canonical slugs are unique", () => {
  const slugs = VACCINE_CATALOG.map((v) => v.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(slugs.includes("influenza"));
  assert.ok(slugs.includes("hepatitis-b"));
});

test("sitemap dedupe collapses repeated tenant-backed canonical URLs", () => {
  const duplicateTenantRows = Array.from({ length: 24 }, (_, index) => ({
    url: "https://afyvia.gtss.software/vaccinations/influenza",
    lastModified: new Date(`2026-09-${String(index + 1).padStart(2, "0")}`),
  }));

  const deduped = uniqueSitemapEntries(duplicateTenantRows);
  assert.equal(deduped.length, 1);
  assert.equal(
    deduped[0].lastModified?.toISOString(),
    new Date("2026-09-24").toISOString(),
  );
});

test("robots configuration disallows private redirected routes and advertises sitemaps", async () => {
  const robotsModule = await import("../app/robots");
  const config = robotsModule.default();
  const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
  assert.ok(rules);
  const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
  assert.ok(disallowed.includes("/api/"));
  assert.ok(disallowed.includes("/admin") || disallowed.includes("/admin/"));
  assert.ok(disallowed.includes("/portal") || disallowed.includes("/portal/"));
  assert.ok(disallowed.includes("/caregiver") || disallowed.includes("/caregiver/"));
  assert.ok(disallowed.includes("/platform") || disallowed.includes("/platform/"));
  assert.ok(disallowed.includes("/onboard") || disallowed.includes("/onboard/"));
  assert.ok(disallowed.includes("/forgot-password"));
  assert.ok(disallowed.includes("/reset-password"));
  assert.ok(config.sitemap);
  const sitemaps = Array.isArray(config.sitemap) ? config.sitemap : [config.sitemap];
  assert.ok(sitemaps.some(s => s.includes("/sitemap-index.xml")));
  assert.ok(sitemaps.some(s => s.includes("/sitemap.xml")));
});

test("platform entity JSON-LD emits logo, sameAs socials, and Knowledge Graph identifiers", async () => {
  const jsonLdModule = await import("../app/components/JsonLd");
  const element = jsonLdModule.default({});
  const rawHtml = element.props.dangerouslySetInnerHTML.__html;
  const parsed = JSON.parse(rawHtml);
  assert.ok(Array.isArray(parsed));
  const org = parsed.find((item: { "@type": string | string[] }) =>
    Array.isArray(item["@type"]) ? item["@type"].includes("Organization") : item["@type"] === "Organization"
  );
  assert.ok(org, "Organization schema must be present");
  assert.ok(org["@id"], "Organization @id must be present");
  assert.ok(org.logo, "Organization logo must be present");
  assert.ok(Array.isArray(org.sameAs) && org.sameAs.length > 0, "Organization sameAs must include socials");
  assert.ok(Array.isArray(org.alternateName), "Alternate names must be present");
  assert.ok(org.alternateName.includes("Afyvia Kenya"), "Must include Afyvia Kenya brand variant");

  const website = parsed.find((item: { "@type": string | string[] }) => item["@type"] === "WebSite");
  assert.ok(website, "WebSite schema must be present");
  assert.ok(website["@id"], "WebSite @id must be present");
  assert.ok(website.potentialAction, "WebSite SearchAction must be present");
  assert.equal(website.potentialAction["@type"], "SearchAction");
  assert.ok(website.potentialAction.target?.urlTemplate?.includes("/medicines?q={search_term_string}"));
});

test("root layout metadata includes brand keywords, googleBot config, and omits hallucinated domains", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const layoutContent = fs.readFileSync(path.resolve(__dirname, "../app/layout.tsx"), "utf8");
  assert.ok(layoutContent.includes('"Afyvia"'), "Must include brand keyword Afyvia");
  assert.ok(layoutContent.includes('"Afyvia Kenya"'), "Must include brand keyword Afyvia Kenya");
  assert.ok(layoutContent.includes('"Afyvia Pharmacy Network"'), "Must include brand keyword Afyvia Pharmacy Network");
  assert.ok(layoutContent.includes('"afyvia.gtss.software"'), "Must include live domain in keywords");
  assert.equal(layoutContent.includes('"afyvia.health"'), false, "Hallucinated non-existent domain must not be in keywords");
  assert.ok(layoutContent.includes("NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION"), "GSC verification env var must be supported");
  assert.ok(layoutContent.includes("googleBot:"), "googleBot crawler config must be declared");
  assert.ok(layoutContent.includes('"max-image-preview": "large"'), "max-image-preview large must be configured");

  const heroContent = fs.readFileSync(path.resolve(__dirname, "../app/components/landing/CareFirstHero.tsx"), "utf8");
  assert.ok(heroContent.includes("Afyvia Pharmacy Network:"), "Homepage H1 must include sr-only Afyvia brand anchor");

  const pharmacyProfileContent = fs.readFileSync(path.resolve(__dirname, "../app/pharmacies/[slug]/page.tsx"), "utf8");
  assert.ok(pharmacyProfileContent.includes("· Afyvia"), "Pharmacy profile titles must include · Afyvia");
  assert.ok(pharmacyProfileContent.includes("on the Afyvia Network"), "Pharmacy profile descriptions must include on the Afyvia Network");
});

test("platform branding and canonical base URL defaults to live domain", async () => {
  const { platform } = await import("../app/lib/data");
  assert.ok(platform.name === "Afyvia");
  assert.ok(platform.description.includes("Afyvia"), "Platform description must contain brand name");
  assert.ok(platform.siteUrl.includes("afyvia.gtss.software"), "Fallback siteUrl must point to live domain");
});

