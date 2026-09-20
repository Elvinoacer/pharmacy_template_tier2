export type TenantBrandCssVars = Record<string, string>;

type Rgb = { r: number; g: number; b: number };

const LIGHT_SURFACES = ["#f4f7f4", "#ffffff"];
const DARK_SURFACES = ["#081410", "#12251d", "#193027"];

export function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(raw);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : null;
}

function rgb(hex: string): Rgb {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function mix(from: string, to: string, amount: number): string {
  const a = rgb(from);
  const b = rgb(to);
  return toHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const c = rgb(hex);
  return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function minimumContrast(color: string, surfaces: string[]): number {
  return Math.min(...surfaces.map((surface) => contrastRatio(color, surface)));
}

/**
 * Preserve a tenant hue whenever possible, nudging only as far toward black or
 * white as required to meet the requested contrast on every supplied surface.
 */
export function ensureContrast(
  rawColor: string,
  surfaces: string[],
  minimum: number,
): string {
  const color = normalizeHexColor(rawColor);
  if (!color) return rawColor;
  if (minimumContrast(color, surfaces) >= minimum) return color;

  const candidates: Array<{ color: string; amount: number }> = [];
  for (const target of ["#000000", "#ffffff"]) {
    if (minimumContrast(target, surfaces) < minimum) continue;

    let low = 0;
    let high = 1;
    for (let i = 0; i < 28; i += 1) {
      const mid = (low + high) / 2;
      const candidate = mix(color, target, mid);
      if (minimumContrast(candidate, surfaces) >= minimum) high = mid;
      else low = mid;
    }
    candidates.push({ color: mix(color, target, high), amount: high });
  }

  if (!candidates.length) {
    return minimumContrast("#000000", surfaces) >= minimum ? "#000000" : "#ffffff";
  }

  candidates.sort((a, b) => a.amount - b.amount);
  return candidates[0].color;
}

export function tenantBrandCssVars(
  primaryValue: string | null | undefined,
  accentValue: string | null | undefined,
): TenantBrandCssVars {
  const primary = normalizeHexColor(primaryValue);
  const accent = normalizeHexColor(accentValue);
  const vars: TenantBrandCssVars = {};

  if (primary) {
    const buttonBg = ensureContrast(primary, ["#ffffff"], 4.5);
    vars["--tenant-brand-primary"] = primary;
    vars["--tenant-brand-primary-text-light"] = ensureContrast(primary, LIGHT_SURFACES, 4.5);
    vars["--tenant-brand-primary-text-dark"] = ensureContrast(primary, DARK_SURFACES, 4.5);
    vars["--tenant-brand-primary-focus-light"] = ensureContrast(primary, LIGHT_SURFACES, 3);
    vars["--tenant-brand-primary-focus-dark"] = ensureContrast(primary, DARK_SURFACES, 3);
    vars["--tenant-brand-button-bg"] = buttonBg;
    vars["--tenant-brand-button-bg-hover"] = mix(buttonBg, "#000000", 0.12);
  }

  if (accent) {
    vars["--tenant-brand-accent"] = accent;
    vars["--tenant-brand-accent-text-light"] = ensureContrast(accent, LIGHT_SURFACES, 4.5);
    vars["--tenant-brand-accent-text-dark"] = ensureContrast(accent, DARK_SURFACES, 4.5);
    vars["--tenant-brand-accent-surface"] = ensureContrast(accent, ["#ffffff"], 4.5);
  }

  return vars;
}
