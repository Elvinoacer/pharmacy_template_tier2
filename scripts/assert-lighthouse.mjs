import fs from "node:fs";

const [file, minPerformance = "0.70", minAccessibility = "0.90", minBestPractices = "0.90"] = process.argv.slice(2);
if (!file) {
  console.error("usage: node scripts/assert-lighthouse.mjs <report.json> [perf] [a11y] [best-practices]");
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(file, "utf8"));
const categories = report.categories ?? {};
const required = {
  performance: Number(minPerformance),
  accessibility: Number(minAccessibility),
  "best-practices": Number(minBestPractices),
};

let failed = false;
for (const [name, threshold] of Object.entries(required)) {
  const score = categories[name]?.score;
  if (typeof score !== "number") {
    console.error(`[lighthouse] missing ${name} score`);
    failed = true;
    continue;
  }
  const pct = Math.round(score * 100);
  const requiredPct = Math.round(threshold * 100);
  console.log(`[lighthouse] ${name}: ${pct} (required >= ${requiredPct})`);
  if (score < threshold) failed = true;
}

const audits = report.audits ?? {};
const coreWebVitals = ["largest-contentful-paint", "cumulative-layout-shift", "interaction-to-next-paint"];
for (const id of coreWebVitals) {
  const audit = audits[id];
  if (audit?.displayValue) console.log(`[lighthouse] ${id}: ${audit.displayValue}`);
}

if (failed) process.exit(1);
