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
