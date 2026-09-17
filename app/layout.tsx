import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import AppChrome from "./components/AppChrome";
import { Toaster } from "./components/Toaster";
import JsonLd from "./components/JsonLd";
import AetherCursor from "./components/AetherCursor";
import { platform } from "./lib/data";
import { ensureEnvConfigured } from "./lib/ensure-env";
import { getResolvedPharmacyOrNull } from "./lib/services/pharmacy-settings";
import { platformBrand, type PublicBrand } from "./lib/brand";
import { SESSION_CLAIM_COOKIE, verifySessionClaim } from "./lib/session-claim";
import "./globals.css";
import "./accessibility-overrides.css";
import "./performance-overrides.css";
import "./aether-backgrounds.css";
import { themeBootstrap } from "./lib/theme-bootstrap";
import ThemeToggle, { ThemeProvider } from "./components/ThemeProvider";

ensureEnvConfigured();

// DM Sans and Fraunces are variable fonts. Loading the variable range avoids
// shipping separate files for every declared weight.
const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#081410" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(platform.siteUrl),
  title: {
    default: `${platform.name} — ${platform.tagline}`,
    template: `%s · ${platform.name}`,
  },
  description: platform.description,
  keywords: [
    "pharmacy Kenya",
    "Aether pharmacy network",
    "prescription refill",
    "vaccinations",
    "neighbourhood pharmacy",
    "PPB licensed",
    "medication counselling",
    "pharmacy delivery Kenya",
  ],
  openGraph: {
    type: "website",
    locale: "en_KE",
    siteName: platform.legalName,
    title: `${platform.name} — ${platform.tagline}`,
    description: platform.description,
    images: [
      {
        url: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/og-preview.jpg",
        width: 1200,
        height: 675,
        type: "image/jpeg",
        alt: `${platform.name} — ${platform.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${platform.name} — ${platform.tagline}`,
    description: platform.description,
    images: ["https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/og-preview.jpg"],
  },
  robots: { index: true, follow: true },
  // Nested indexable pages own their canonical URL. A root canonical would be
  // inherited by routes that forget to override it.
};

function safeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^#[0-9a-fA-F]{3,8}$/.test(value.trim()) ? value.trim() : null;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The proxy supplies the storefront slug in a trusted internal header. Do
  // not resolve a generic tenant or a DB-backed session in the root layout:
  // doing so makes every anonymous public route dynamic and database-bound.
  const hdrs = await headers().catch(() => null);
  const storefrontSlug = hdrs?.get("x-pharmacy-slug")?.trim().toLowerCase() || null;
  const onStorefrontRewrite = Boolean(storefrontSlug);

  // When this is a storefront request, use the same request-memoized resolver
  // the page will use. Passing a fresh { slug } object here previously caused
  // the root layout and page to perform separate pharmacy/settings round-trips
  // for the exact same tenant on every medicines/services request.
  const resolved = storefrontSlug
    ? await getResolvedPharmacyOrNull().catch(() => null)
    : null;

  const brandPrimary = safeHex(resolved?.brandPrimary);
  const brandAccent = safeHex(resolved?.brandAccent);
  let tenantStyle: CSSProperties | undefined;
  if (onStorefrontRewrite && (brandPrimary || brandAccent)) {
    tenantStyle = {
      ...(brandPrimary ? { "--tenant-brand-primary": brandPrimary } : {}),
      ...(brandAccent ? { "--tenant-brand-accent": brandAccent } : {}),
    } as CSSProperties;
  }

  const storefrontBrand: PublicBrand | null = resolved
    ? {
        name: resolved.name,
        tagline: resolved.tagline,
        phone: resolved.phone,
        phoneHref: resolved.phoneHref,
        email: resolved.email,
        addressShort:
          [resolved.address.street, resolved.address.city].filter(Boolean).join(", ") || "Kenya",
        addressFull: resolved.address.full || "Kenya",
        hours: resolved.hours,
        whatsappHref: resolved.whatsappHref,
        slug: resolved.slug,
        logoUrl: resolved.logoUrl,
      }
    : null;

  // Public chrome only needs a routing hint (customer/admin/caregiver), not a
  // fresh database session. The signed short-lived claim is already validated
  // by the same AUTH_SECRET used by the proxy; sensitive pages still perform
  // full DB-backed authorization in their own layouts/actions.
  let sessionHint: {
    role: string;
    customerId: string | null;
    platformAdmin: boolean;
  } | null = null;
  try {
    const jar = await cookies();
    const claim = await verifySessionClaim(jar.get(SESSION_CLAIM_COOKIE)?.value);
    if (claim) {
      sessionHint = {
        role: claim.role,
        customerId: claim.customerId,
        platformAdmin: claim.platformAdmin,
      };
    }
  } catch {
    sessionHint = null;
  }

  let initialTheme: "light" | "dark" | undefined = undefined;
  try {
    const jar = await cookies();
    const cookieTheme = jar.get("aether-theme")?.value;
    if (cookieTheme === "dark" || cookieTheme === "light") {
      initialTheme = cookieTheme;
    }
  } catch {
    /* fallback to script bootstrap */
  }

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-theme={initialTheme}
      data-admin-theme={initialTheme}
      suppressHydrationWarning
      className={`${dmSans.variable} ${fraunces.variable} ${jetbrains.variable} ${initialTheme === "dark" ? "dark " : ""}h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        className="flex min-h-full flex-col font-sans"
        data-tenant-theme={tenantStyle ? "true" : undefined}
        style={tenantStyle}
      >
        <div className="aether-global-backdrop" aria-hidden="true">
          <picture className="aether-global-picture">
            <source media="(min-width: 768px)" srcSet="/images/aether_bg_pc.webp" />
            <img
              src="/images/aether_bg_mobile.jpg"
              alt=""
              className="aether-global-image"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
          <div className="aether-global-veil" />
        </div>
        <div className="aether-app-layer">
          <ThemeProvider>
            <div className="global-theme-control">
              <ThemeToggle />
            </div>
            <AetherCursor />
            <JsonLd pharmacy={onStorefrontRewrite ? resolved : null} />
            <AppChrome
              sessionUser={sessionHint}
              pharmacySlug={storefrontSlug}
              storefrontBrand={storefrontBrand}
              platformBrand={platformBrand()}
            >
              {children}
            </AppChrome>
            <Toaster />
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
