import type { Metadata } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import AppChrome from "./components/AppChrome";
import { Toaster } from "./components/Toaster";
import JsonLd from "./components/JsonLd";
import { getSessionUser } from "./lib/auth";
import { pharmacy, platform } from "./lib/data";
import { ensureEnvConfigured } from "./lib/ensure-env";
import { getTenant } from "./lib/tenant";
import "./globals.css";

// Validate critical env vars (DATABASE_URL, AUTH_SECRET, NEXT_SERVER_ACTIONS_ENCRYPTION_KEY)
// eagerly at startup. Throws in dev, warns in production.
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

export const metadata: Metadata = {
  metadataBase: new URL(pharmacy.siteUrl),
  title: {
    default: `${platform.name} — ${platform.tagline}`,
    template: `%s · ${platform.name}`,
  },
  description: platform.description,
  keywords: [
    "pharmacy",
    "Austin pharmacy",
    "prescription refill",
    "vaccinations",
    "immunization",
    "preventive health",
    "travel vaccines",
    "medication counselling",
    "pharmacy delivery",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: pharmacy.name,
    title: pharmacy.name,
    description: pharmacy.description,
    images: [
      {
        url: "/images/og-preview.jpg",
        width: 1200,
        height: 675,
        type: "image/jpeg",
        alt: `${pharmacy.name} — ${pharmacy.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pharmacy.name,
    description: pharmacy.description,
    images: ["/images/og-preview.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Best-effort session for public chrome (dynamic Sign in / portal CTA).
  // Failures must not take down the public site.
  const sessionUser = await getSessionUser().catch(() => null);
  const tenant = await getTenant().catch(() => ({ slug: null as string | null }));
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
      className={`${dmSans.variable} ${fraunces.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <JsonLd />
        <AppChrome sessionUser={sessionHint} pharmacySlug={tenant.slug}>
          {children}
        </AppChrome>
        <Toaster />
      </body>
    </html>
  );
}
