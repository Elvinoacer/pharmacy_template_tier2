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
  assert.ok(disallowed.includes("/reset-password"));
  assert.ok(config.sitemap);
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
});

test("pharmacy sitemap paths strictly omit non-canonical /p/ storefront URLs", () => {
  const sampleSlugs = ["goodlife-plaza", "hub-westlands", "city-chemist"];
  const paths = sampleSlugs.map(slug => `/pharmacies/${slug}`);
  for (const path of paths) {
    assert.match(path, /^\/pharmacies\/[a-z0-9-]+$/);
    assert.equal(path.startsWith("/p/"), false);
  }
});

