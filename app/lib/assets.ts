export const R2_PUBLIC_BASE =
  (typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL)) ||
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev";

/**
 * Resolves an image path to an absolute Cloudflare R2 URL.
 */
export function getR2ImageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const clean = path.replace(/^\/+/, "");
  return `${R2_PUBLIC_BASE.replace(/\/$/, "")}/${clean}`;
}
