import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { formatDate } from "@/app/lib/time";
import {
  HeartHandshake,
  Pill,
  Bell,
  Activity,
  FileText,
  Plus,
  User,
} from "lucide-react";

export const metadata = { title: "Caregiver portal" };

/**
 * Dedicated caregiver dashboard.
 * Shows patients the caregiver is linked to, with actions for:
 * - request refills
 * - view pickup-ready notifications
 * - view medication / adherence summaries
 */
export default async function CaregiverPortalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/caregiver");

  // Find active caregiver links for this user.
  const links = await prisma.caregiver.findMany({
    where: {
      caregiverUserId: user.id,
      status: "active",
    },
    include: {
      customer: {
        include: {
          prescriptions: {
            where: { status: "active" },
            orderBy: { medicineName: "asc" },
            take: 20,
          },
          refillRequests: {
            where: { status: { in: ["submitted", "under_review", "approved", "preparing", "ready_for_pickup"] } },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          notifications: {
            where: { deletedAt: null, type: { in: ["refill", "pickup", "reminder"] } },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          adherenceLogs: {
            orderBy: { takenOn: "desc" },
            take: 14,
          },
        },
      },
    },
  });

  // Staff who also have caregiver links, or pure caregivers.
  if (links.length === 0 && user.role !== "caregiver") {
    // Not a caregiver — send customers to portal, staff to admin.
    if (user.role === "customer" || user.customerId) redirect("/portal");
    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-[#f4f7f4]">
      <header className="border-b border-[#e3ebe6] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0c1a14]">Caregiver portal</p>
              <p className="text-xs text-[#5a6b62]">{user.email}</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <Link href="/login" className="text-xs font-semibold text-[#0d6e5a] hover:underline">
              Sign out via login
            </Link>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0c1a14]">Patients you support</h1>
          <p className="mt-1 text-sm text-[#5a6b62]">
            Request refills, track adherence, and receive pickup notifications on their behalf.
          </p>
        </div>

        {links.length === 0 ? (
          <div className="rounded-2xl border border-[#e3ebe6] bg-white p-8 text-center">
            <User className="mx-auto h-10 w-10 text-[#8a9a92]" />
            <p className="mt-3 font-semibold text-[#0c1a14]">No linked patients yet</p>
            <p className="mt-1 text-sm text-[#5a6b62]">
              Accept a caregiver invitation link from a patient to get started.
            </p>
          </div>
        ) : (
          links.map((link) => {
            const patient = link.customer;
            const readyPickups = patient.refillRequests.filter((r) => r.status === "ready_for_pickup");
            const recentAdherence = patient.adherenceLogs;
            const taken = recentAdherence.filter((a) => a.status === "taken" || a.status === "late").length;
            const rate =
              recentAdherence.length > 0
                ? Math.round((taken / recentAdherence.length) * 100)
                : null;

            return (
              <section
                key={link.id}
                className="rounded-2xl border border-[#e3ebe6] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#0c1a14]">{patient.fullName}</h2>
                    <p className="text-xs text-[#5a6b62]">
                      Relationship: {link.relationship || "Caregiver"}
                      {link.canRequestRefills ? " · Can request refills" : ""}
                      {link.canReceivePickupNotifications ? " · Pickup alerts on" : ""}
                    </p>
                  </div>
                  {rate !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ef] px-3 py-1 text-xs font-semibold text-[#0d6e5a]">
                      <Activity className="h-3 w-3" /> Adherence ~{rate}%
                    </span>
                  )}
                </div>

                {/* Prescriptions */}
                <div className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#8a9a92]">
                    <FileText className="h-3 w-3" /> Medications
                  </p>
                  {patient.prescriptions.length === 0 ? (
                    <p className="text-sm text-[#5a6b62]">No active prescriptions on file.</p>
                  ) : (
                    <ul className="space-y-2">
                      {patient.prescriptions.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f4f7f4] px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0c1a14]">{p.medicineName}</p>
                            <p className="text-[10px] text-[#5a6b62]">
                              {p.dosage || "—"} · {p.refillsRemaining ?? 0} refills left
                              {p.nextRefillDue ? ` · due ${formatDate(p.nextRefillDue)}` : ""}
                            </p>
                          </div>
                          {link.canRequestRefills && (p.refillsRemaining ?? 0) > 0 && (
                            <Link
                              href={`/portal/refills/new?prescriptionId=${p.id}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[#0d6e5a] px-3 py-1 text-[10px] font-semibold text-white hover:bg-[#084c3f]"
                            >
                              <Plus className="h-3 w-3" /> Request refill
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Active refills / pickups */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#8a9a92]">
                      <Pill className="h-3 w-3" /> Open refill requests
                    </p>
                    {patient.refillRequests.length === 0 ? (
                      <p className="text-sm text-[#5a6b62]">None in progress.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {patient.refillRequests.map((r) => (
                          <li key={r.id} className="rounded-lg bg-[#f4f7f4] px-3 py-2 text-xs">
                            <span className="font-semibold text-[#0c1a14]">{r.medicineName}</span>
                            <span className="ml-2 capitalize text-[#5a6b62]">
                              {r.status.replace(/_/g, " ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#8a9a92]">
                      <Bell className="h-3 w-3" /> Pickup notifications
                    </p>
                    {readyPickups.length > 0 ? (
                      <ul className="space-y-1.5">
                        {readyPickups.map((r) => (
                          <li
                            key={r.id}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
                          >
                            <strong>{r.medicineName}</strong> is ready for pickup
                          </li>
                        ))}
                      </ul>
                    ) : patient.notifications.length > 0 ? (
                      <ul className="space-y-1.5">
                        {patient.notifications.slice(0, 5).map((n) => (
                          <li key={n.id} className="rounded-lg bg-[#f4f7f4] px-3 py-2 text-xs text-[#5a6b62]">
                            {n.title}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[#5a6b62]">No pickup alerts right now.</p>
                    )}
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
