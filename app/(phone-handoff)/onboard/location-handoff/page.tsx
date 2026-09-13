import type { Metadata } from "next";
import PhoneLocationHandoffClient from "@/app/components/location/PhoneLocationHandoffClient";

// The QR handoff carries a one-time token in the query string. Keep this route
// fully dynamic so the token is never lost behind route/static caching.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Confirm pharmacy location",
  robots: { index: false, follow: false },
};

export default async function PharmacyLocationHandoffPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawToken = params.token;
  const token = Array.isArray(rawToken) ? rawToken[0] || "" : rawToken || "";

  return <PhoneLocationHandoffClient token={token} />;
}
