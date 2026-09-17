import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ pharmacyId?: string }>;
};

/**
 * Backward compatibility redirect for old verification links sent in emails or bookmarks.
 * All verification flows now live canonically under `/onboard`.
 */
export default async function PharmacyVerificationPage({ searchParams }: PageProps) {
  const user = await getSessionUser().catch(() => null);
  if (!user) {
    redirect("/login?next=/onboard?stage=verification");
  }

  const params = await searchParams;
  const pharmacyParam = params.pharmacyId ? `&pharmacyId=${encodeURIComponent(params.pharmacyId)}` : "";
  redirect(`/onboard?stage=verification${pharmacyParam}`);
}
