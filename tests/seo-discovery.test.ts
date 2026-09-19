import test from "node:test";
import assert from "node:assert/strict";
import { serializeJsonLd, locationPath, uniqueSitemapEntries } from "../app/lib/seo";

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
