import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { listCustomerVaccinationPortal } from "@/app/lib/services/vaccination-service";
import { COUNSELLING_TOPICS } from "@/app/lib/vaccination-catalog";
import { HeartPulse } from "lucide-react";
import { getTenant } from "@/app/lib/tenant";

export const metadata = { title: "Preventive counselling" };
export const dynamic = "force-dynamic";

export default async function PortalPreventivePage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();
  const tenant = await getTenant().catch(() => ({ slug: null as string | null }));
  const shopBase = tenant.slug ? `/p/${tenant.slug}` : null;
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
        <Link
          href={shopBase ? `${shopBase}/preventive` : "/preventive"}
          className="btn-primary min-h-11 w-full justify-center sm:w-auto"
        >
          <HeartPulse className="h-4 w-4" /> Book a session
        </Link>
      }
    >
      {data.counselling.length === 0 ? (
        <div className="min-w-0 rounded-2xl border border-[#e3ebe6] bg-white p-4 text-base leading-relaxed text-[#5a6b62] dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-400 sm:p-6 lg:p-8">
          No counselling sessions yet.{" "}
          <Link
            href={shopBase ? `${shopBase}/preventive` : "/preventive"}
            className="inline-flex min-h-11 items-center font-semibold text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
          >
            Request one
          </Link>
          .
        </div>
      ) : (
        <ul className="grid min-w-0 gap-3 md:grid-cols-2">
          {data.counselling.map((c) => (
            <li
              key={c.id}
              className="min-w-0 rounded-2xl border border-[#e3ebe6] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035] sm:p-5"
            >
              <p className="break-words text-sm font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">{c.status}</p>
              <h2 className="mt-1 break-words font-semibold text-[#0c1a14] dark:text-slate-100">
                {COUNSELLING_TOPICS.find((t) => t.slug === c.topic)?.title || c.topic}
              </h2>
              <p className="mt-1 break-words text-sm leading-relaxed text-[#5a6b62] dark:text-slate-400">
                {c.preferredDate || new Date(c.createdAt).toLocaleDateString()} · {c.format.replace(/_/g, " ")}
              </p>
              {c.summary && (
                <p className="mt-3 break-words text-base leading-relaxed text-[#5a6b62] dark:text-slate-300">{c.summary}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}
