"use client";

import { usePathname } from "next/navigation";
import AiChatbot from "./AiChatbot";
import Footer from "./Footer";
import Navbar from "./Navbar";
import { LiveAlertCenter } from "./LiveAlertCenter";
import type { PortalSessionHint } from "@/app/lib/portal-dest";
import { publicSurface, unscopedPublicBrand, type PublicBrand } from "@/app/lib/brand";
import { TenantBrandProvider } from "@/app/components/TenantBrand";
import { platform } from "@/app/lib/data";

const BARE_PREFIXES = [
  "/portal",
  "/admin",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/caregiver",
  "/platform",
  "/onboard",
];

export default function AppChrome({
  children,
  sessionUser = null,
  pharmacySlug = null,
  storefrontBrand = null,
  platformBrand,
}: {
  children: React.ReactNode;
  sessionUser?: PortalSessionHint | null;
  pharmacySlug?: string | null;
  storefrontBrand?: PublicBrand | null;
  platformBrand: PublicBrand;
}) {
  const pathname = usePathname() || "/";
  const bare = BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (bare) {
    return <>{children}</>;
  }

  // The platform landing page owns its full-bleed navigation and footer so
  // the visual shell can match the product design reference exactly.
  if (pathname === "/") {
    return <>{children}</>;
  }

  const surface = publicSurface(pathname, pharmacySlug);
  // A non-platform page with no selected tenant must never inherit Aether's
  // identity. It remains useful as a generic public template until a tenant
  // is selected, while the platform landing pages continue to use Aether.
  const brand =
    surface === "storefront"
      ? storefrontBrand ?? unscopedPublicBrand()
      : platformBrand;
  const hasLandingMobileActionBar = pathname === "/";

  return (
    <TenantBrandProvider
      value={{
        name: brand.name,
        network: platform.legalName,
        slug: brand.slug,
      }}
    >
      <div className="mesh-bg relative flex min-h-screen flex-col">
        <Navbar
          sessionUser={sessionUser}
          pharmacySlug={surface === "storefront" ? brand.slug : null}
          surface={surface}
          brand={brand}
        />
        <main className="flex-1">{children}</main>
        <Footer surface={surface} brand={brand} clearMobileActionBar={hasLandingMobileActionBar} />
        {surface === "storefront" && <AiChatbot />}
        {surface === "storefront" && <LiveAlertCenter audience="public" />}
      </div>
    </TenantBrandProvider>
  );
}
