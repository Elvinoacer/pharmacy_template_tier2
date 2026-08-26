import type { Metadata, Viewport } from "next";
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
  themeColor: "#020b08",
  colorScheme: "dark",
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
  alternates: { canonical: "/" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessionUser = await getSessionUser().catch(() => null);
  const tenant = await getTenant().catch(() => ({ slug: null as string | null }));
  const hdrs = await headers().catch(() => null);
  const onStorefrontRewrite = Boolean(hdrs?.get("x-pharmacy-slug"));
  const resolved = tenant.slug
    ? await getResolvedPharmacyOrNull({ slug: tenant.slug }).catch(() => null)
    : null;

  const storefrontBrand: PublicBrand | null = resolved
    ? { name: resolved.name, tagline: resolved.tagline, phone: resolved.phone, phoneHref: resolved.phoneHref, email: resolved.email, addressShort: [resolved.address.street, resolved.address.city].filter(Boolean).join(", ") || "Kenya", addressFull: resolved.address.full || "Kenya", hours: resolved.hours, whatsappHref: resolved.whatsappHref, slug: resolved.slug, logoUrl: resolved.logoUrl }
    : null;

  const sessionHint = sessionUser ? { role: sessionUser.role, customerId: sessionUser.customerId, fullName: sessionUser.fullName, platformAdmin: sessionUser.platformAdmin } : null;

  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#020b08] font-sans">
        <AetherCursor />
        <JsonLd pharmacy={onStorefrontRewrite ? resolved : null} />
        <AppChrome sessionUser={sessionHint} pharmacySlug={tenant.slug} storefrontBrand={storefrontBrand} platformBrand={platformBrand()}>
          {children}
        </AppChrome>
        <Toaster />
      </body>
    </html>
  );
}
