"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Navbar from "./Navbar";
import NavbarNavigationFix from "./NavbarNavigationFix";
import type { PortalSessionHint } from "@/app/lib/portal-dest";
import { publicSurface, unscopedPublicBrand, type PublicBrand } from "@/app/lib/brand";
import { TenantBrandProvider } from "@/app/components/TenantBrand";
import { platform } from "@/app/lib/data";
import publicChromeStyles from "./landing/PublicChromeTheme.module.css";

const AiChatbot = dynamic(() => import("./AiChatbot"), { ssr: false });
const LiveAlertCenter = dynamic(
  () => import("./LiveAlertCenter").then((mod) => mod.LiveAlertCenter),
  { ssr: false },
);
const QuickPageAssist = dynamic(() => import("./assist/QuickPageAssist"), { ssr: false });
const VerificationStatusModal = dynamic(() => import("./VerificationStatusModal"), {
  ssr: false,
});

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

  if (bare) return <>{children}</>;

  const surface = publicSurface(pathname, pharmacySlug);
  const brand =
    surface === "storefront"
      ? storefrontBrand ?? unscopedPublicBrand()
      : platformBrand;
  const isLandingPage = pathname === "/";
  const hasLandingMobileActionBar = isLandingPage;

  return (
    <TenantBrandProvider
      value={{
        name: brand.name,
        network: platform.legalName,
        slug: brand.slug,
      }}
    >
      <div
        className={`mesh-bg relative flex min-h-screen flex-col ${publicChromeStyles.publicChrome} ${
          isLandingPage ? publicChromeStyles.landingChrome : ""
        }`}
      >
        <NavbarNavigationFix />
        <Navbar
          sessionUser={sessionUser}
          pharmacySlug={surface === "storefront" ? brand.slug : null}
          surface={surface}
          brand={brand}
        />
        <a href="#main-content" className="skip-link">Skip to content</a>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">{children}</main>
        <div id="site-footer" className="shrink-0">
          <Footer surface={surface} brand={brand} clearMobileActionBar={hasLandingMobileActionBar} />
        </div>
        {surface === "storefront" ? <AiChatbot /> : null}
        {surface === "storefront" ? <LiveAlertCenter audience="public" /> : null}
        <QuickPageAssist />
        {sessionUser ? <VerificationStatusModal /> : null}
      </div>
    </TenantBrandProvider>
  );
}
