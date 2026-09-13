"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Navbar from "./Navbar";
import NavbarNavigationFix from "./NavbarNavigationFix";
import MobileCareDock, {
  shouldShowMobileCareDock,
} from "./landing/LandingMobileActionBar";
import type { PortalSessionHint } from "@/app/lib/portal-dest";
import { publicSurface, unscopedPublicBrand, type PublicBrand } from "@/app/lib/brand";
import { TenantBrandProvider } from "@/app/components/TenantBrand";
import { platform } from "@/app/lib/data";
import CareMotion from "./care/CareMotion";
import CareMobileNav from "./care/CareMobileNav";
import careStyles from "./care/CareExperience.module.css";
import publicChromeStyles from "./landing/PublicChromeTheme.module.css";
import contrastStyles from "./landing/PublicChromeContrast.module.css";

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
  "/p", // Explicit storefront routes provide their own pharmacy-only chrome.
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
  const isCarePage = ["/", "/medicines", "/services", "/prescription", "/refill", "/pharmacies", "/order", "/about"].some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)));
  const hasMobileCareDock = shouldShowMobileCareDock(pathname);

  return (
    <TenantBrandProvider
      value={{
        name: brand.name,
        network: platform.legalName,
        slug: brand.slug,
      }}
    >
      <div
        className={`mesh-bg relative flex min-h-screen flex-col ${isCarePage ? careStyles.experience : ""} ${publicChromeStyles.publicChrome} ${
          isLandingPage
            ? `${publicChromeStyles.landingChrome} ${contrastStyles.landingContrast}`
            : ""
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
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1"><div key={pathname} className={isCarePage ? careStyles.enter : undefined}>{children}{isCarePage && <CareMotion />}</div></main>
        <div id="site-footer" className="shrink-0">
          <Footer surface={surface} brand={brand} clearMobileActionBar={hasMobileCareDock} />
        </div>
        {surface === "storefront" ? <AiChatbot /> : null}
        {surface === "storefront" ? <LiveAlertCenter audience="public" /> : null}
        <QuickPageAssist />
        {!isLandingPage && isCarePage ? <CareMobileNav /> : !isLandingPage && hasMobileCareDock ? <MobileCareDock /> : null}
        {sessionUser ? <VerificationStatusModal /> : null}
      </div>
    </TenantBrandProvider>
  );
}
