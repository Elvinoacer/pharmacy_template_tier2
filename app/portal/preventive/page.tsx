import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { listCustomerVaccinationPortal } from "@/app/lib/services/vaccination-service";
import { COUNSELLING_TOPICS } from "@/app/lib/vaccination-catalog";
import { HeartPulse } from "lucide-react";

export const metadata = { title: "Preventive counselling" };
export const dynamic = "force-dynamic";

export default async function PortalPreventivePage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();
  const data = await listCustomerVaccinationPortal(user.customerId).catch(() => ({
    counselling: [] as Awaited<ReturnType<typeof listCustomerVaccinationPortal>>["counselling"],
    appointments: [],
    records: [],
  }));

  return (
    <PortalShell
      user={user}
      title="Preventive counselling"
      subtitle="Travel health, cessation, immunisation education, and other pharmacist counselling sessions."
      actions={
        <Link href="/preventive" className="btn-primary">
          <HeartPulse className="h-4 w-4" /> Book a session
        </Link>
      }
    >
      {data.counselling.length === 0 ? (
        <div className="rounded-2xl border border-[#e3ebe6] bg-white p-8 text-sm text-[#5a6b62]">
          No counselling sessions yet.{" "}
          <Link href="/preventive" className="font-semibold text-teal-800">
            Request one
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-3">
          {data.counselling.map((c) => (
            <li key={c.id} className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{c.status}</p>
              <h2 className="mt-1 font-semibold text-[#0c1a14]">
                {COUNSELLING_TOPICS.find((t) => t.slug === c.topic)?.title || c.topic}
              </h2>
              <p className="mt-1 text-xs text-[#5a6b62]">
                {c.preferredDate || new Date(c.createdAt).toLocaleDateString()} · {c.format.replace(/_/g, " ")}
              </p>
              {c.summary && <p className="mt-3 text-sm leading-relaxed text-[#5a6b62]">{c.summary}</p>}
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}
