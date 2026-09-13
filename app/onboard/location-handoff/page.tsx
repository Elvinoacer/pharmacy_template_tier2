import type { Metadata } from "next";
import PhoneLocationHandoffClient from "@/app/components/location/PhoneLocationHandoffClient";

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
