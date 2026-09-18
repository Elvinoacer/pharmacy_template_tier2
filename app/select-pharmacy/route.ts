import { NextRequest, NextResponse } from "next/server";
import {
  PUBLIC_PHARMACY_COOKIE,
  findPharmacyBySlug,
  isActiveListed,
} from "@/app/lib/tenant";
import { isSafeInternalPath } from "@/app/lib/session-claim";

const PUBLIC_DESTINATIONS = [
  "/services",
  "/medicines",
  "/refill",
  "/order",
  "/search",
  "/preventive",
  "/screenings",
  "/vaccinations",
  "/delivery",
  "/faq",
  "/careers",
  "/contact",
] as const;

function safeDestination(raw: string | null): string {
  const candidate = isSafeInternalPath(raw) ? raw : "/";
  const parsed = new URL(candidate, "https://afyvia.local");
  const allowed =
    parsed.pathname === "/" ||
    PUBLIC_DESTINATIONS.some(
      (prefix) =>
        parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );

  if (!allowed) return "/";

  // Selection controls should never survive the handoff because they can
  // immediately reopen the chooser and make the successful click look broken.
  parsed.searchParams.delete("changePharmacy");
  parsed.searchParams.delete("pharmacy");

  const query = parsed.searchParams.toString();
  return `${parsed.pathname}${query ? `?${query}` : ""}`;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  const next = safeDestination(request.nextUrl.searchParams.get("next"));

  const pharmacy = slug ? await findPharmacyBySlug(slug).catch(() => null) : null;
  if (!pharmacy || !isActiveListed(pharmacy)) {
    const invalid = new URL("/pharmacies", request.url);
    invalid.searchParams.set("selection", "unavailable");
    return NextResponse.redirect(invalid, 303);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(PUBLIC_PHARMACY_COOKIE, pharmacy.slug, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
