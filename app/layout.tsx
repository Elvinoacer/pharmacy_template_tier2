import type { Metadata } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import AppChrome from "./components/AppChrome";
import JsonLd from "./components/JsonLd";
import { pharmacy } from "./lib/data";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(pharmacy.siteUrl),
  title: {
    default: `${pharmacy.name} — ${pharmacy.tagline}`,
    template: `%s · ${pharmacy.name}`,
  },
  description: pharmacy.description,
  keywords: [
    "pharmacy",
    "Austin pharmacy",
    "prescription refill",
    "vaccinations",
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
        url: "/images/gallery/welcoming_retail_floor.webp",
        width: 1200,
        height: 630,
        alt: `${pharmacy.name} interior`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pharmacy.name,
    description: pharmacy.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <JsonLd />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
