import Link from "next/link";
import { prismaUnscoped } from "@/app/lib/db";
import type { PharmacyStatus } from "@/app/generated/prisma/client";

export const metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { value: "", label: "Whole queue" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "needs_info", label: "Needs info" },
  { value: "draft", label: "Drafts" },
] as const;

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = (params.status || "").trim();
  const q = (params.q || "").trim();

  const where = {
    ...(status
      ? { status: status as PharmacyStatus }
      : { status: { in: ["submitted", "under_review", "needs_info", "draft"] as PharmacyStatus[] } }),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { licenseNumber: { contains: q, mode: "insensitive" as const } },
            { city: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const rows = await prismaUnscoped.pharmacy
    .findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    })
    .catch(() => []);

  return (
    <div>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
        Verification queue
      </h1>
      <p className="mt-2 text-sm text-teal-100/70">
        Drafts are owner-only. Submitted and needs-info rows need a human decision. Age is measured
        from submission.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => {
          const href = t.value ? `/platform/applications?status=${t.value}` : "/platform/applications";
          const active = status === t.value;
          return (
            <Link
              key={t.value}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active ? "border-white/40 bg-white/15 text-white" : "border-white/15 text-teal-100/70 hover:bg-white/5"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
        <form method="GET" className="ml-auto flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search queue…"
            aria-label="Search applications"
            className="h-9 w-44 rounded-full border border-white/15 bg-black/30 px-3 text-xs outline-none placeholder:text-teal-100/40 focus:border-teal-300/40"
          />
          <button type="submit" className="h-9 rounded-full bg-white/10 px-3 text-xs font-semibold hover:bg-white/15">
            Search
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-teal-100/60">
            <tr>
              <th className="px-4 py-3">Pharmacy</th>
              <th className="px-4 py-3">Licence</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-teal-100/50">
                  Queue is clear.
                </td>
              </tr>
            )}
            {rows.map((p) => {
              const age = daysSince(p.submittedAt ?? p.createdAt);
              const aged = p.status === "submitted" && age != null && age >= 3;
              return (
                <tr key={p.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/platform/pharmacies/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-teal-100/50">/p/{p.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-teal-100/80">{p.licenseNumber || "—"}</td>
                  <td className="px-4 py-3 text-teal-100/80">{p.city || "—"}</td>
                  <td className="px-4 py-3 text-teal-100/80">
                    {age == null ? "—" : `${age}d`}
                    {aged && <span className="ml-2 text-amber-300">⚠ aging</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase">
                      {p.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
