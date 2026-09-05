import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import AppChrome from "./components/AppChrome";
import { Toaster } from "./components/Toaster";
import JsonLd from "./components/JsonLd";
import AetherCursor from "./components/AetherCursor";
import { getSessionUser } from "./lib/auth";
import { platform } from "./lib/data";
import { ensureEnvConfigured } from "./lib/ensure-env";
import { getTenant } from "./lib/tenant";
import { getResolvedPharmacyOrNull } from "./lib/services/pharmacy-settings";
import { platformBrand, type PublicBrand } from "./lib/brand";
import { headers } from "next/headers";
import "./globals.css";
import "./accessibility-overrides.css";
import { themeBootstrap } from "./lib/theme-bootstrap";
import ThemeToggle, { ThemeProvider } from "./components/ThemeProvider";

ensureEnvConfigured();

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  // Do not define a root canonical here: nested pages that forget to override
  // it would otherwise inherit `/`. Indexable pages should own their canonical.
};

function safeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^#[0-9a-fA-F]{3,8}$/.test(value.trim()) ? value.trim() : null;
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessionUser = await getSessionUser().catch(() => null);
  const tenant = await getTenant().catch(() => ({ slug: null as string | null }));
  const hdrs = await headers().catch(() => null);
  const onStorefrontRewrite = Boolean(hdrs?.get("x-pharmacy-slug"));
  const resolved = tenant.slug
    ? await getResolvedPharmacyOrNull({ slug: tenant.slug }).catch(() => null)
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

  const sessionHint = sessionUser
    ? {
        role: sessionUser.role,
        customerId: sessionUser.customerId,
        fullName: sessionUser.fullName,
        platformAdmin: sessionUser.platformAdmin,
      }
    : null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${fraunces.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        className="flex min-h-full flex-col bg-background font-sans"
        data-tenant-theme={tenantStyle ? "true" : undefined}
        style={tenantStyle}
      >
        <ThemeProvider>
          <div className="global-theme-control">
            <ThemeToggle />
          </div>
          <AetherCursor />
          <JsonLd pharmacy={onStorefrontRewrite ? resolved : null} />
          <AppChrome
            sessionUser={sessionHint}
            pharmacySlug={tenant.slug}
            storefrontBrand={storefrontBrand}
            platformBrand={platformBrand()}
          >
            {children}
          </AppChrome>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
