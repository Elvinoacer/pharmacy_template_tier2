import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ step?: string }>;
};

/**
 * Backward-compatibility redirect for `/admin/setup`.
 * The setup and launch experience is now canonically part of the unified onboarding journey at `/onboard?stage=setup`.
 */
export default async function AdminSetupPage(props: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/setup");

  const pharmacyId = user.activePharmacyId || user.memberships[0]?.pharmacyId;
  if (!pharmacyId) redirect("/onboard");

  const [pharmacy, readiness, params] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true, status: true, setupCompletedAt: true, listed: true, verifiedAt: true },
    }),
    loadPharmacySetup(pharmacyId),
    props.searchParams ? await props.searchParams : {},
  ]);

  if (!pharmacy) redirect("/onboard");
  if (!pharmacy.verifiedAt || !["approved", "active"].includes(pharmacy.status)) {
    redirect("/onboard");
  }
  if (pharmacy.setupCompletedAt && pharmacy.status === "active" && pharmacy.listed && readiness.ready) {
    redirect("/admin");
  }

  const step = params?.step;
  const stepParam = step ? `&setupStep=${encodeURIComponent(step)}` : "";
  redirect(`/onboard?stage=setup${stepParam}`);
}
