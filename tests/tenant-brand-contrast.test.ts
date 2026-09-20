import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contrastRatio,
  normalizeHexColor,
  tenantBrandCssVars,
} from "../app/lib/accessibility/tenant-brand-contrast";

describe("tenant storefront brand contrast", () => {
  it("accepts only opaque 3/6 digit hex colours", () => {
    assert.equal(normalizeHexColor("#abc"), "#aabbcc");
    assert.equal(normalizeHexColor("#A1B2C3"), "#a1b2c3");
    assert.equal(normalizeHexColor("#ffffff80"), null);
    assert.equal(normalizeHexColor("yellow"), null);
  });

  it("derives accessible light/dark text, focus and button shades from a bright brand", () => {
    const vars = tenantBrandCssVars("#ffff00", "#00ffff");

    assert.ok(contrastRatio(vars["--tenant-brand-primary-text-light"], "#f4f7f4") >= 4.5);
    assert.ok(contrastRatio(vars["--tenant-brand-primary-text-dark"], "#193027") >= 4.5);
    assert.ok(contrastRatio(vars["--tenant-brand-primary-focus-light"], "#f4f7f4") >= 3);
    assert.ok(contrastRatio(vars["--tenant-brand-primary-focus-dark"], "#193027") >= 3);
    assert.ok(contrastRatio(vars["--tenant-brand-button-bg"], "#ffffff") >= 4.5);

    assert.ok(contrastRatio(vars["--tenant-brand-accent-text-light"], "#f4f7f4") >= 4.5);
    assert.ok(contrastRatio(vars["--tenant-brand-accent-text-dark"], "#193027") >= 4.5);
  });

  it("lifts an extremely dark brand for dark-mode text without changing the stored raw colour", () => {
    const vars = tenantBrandCssVars("#000000", null);

    assert.equal(vars["--tenant-brand-primary"], "#000000");
    assert.ok(contrastRatio(vars["--tenant-brand-primary-text-light"], "#ffffff") >= 4.5);
    assert.ok(contrastRatio(vars["--tenant-brand-primary-text-dark"], "#193027") >= 4.5);
  });
});
