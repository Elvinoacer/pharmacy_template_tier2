import Link from "next/link";
import { prismaUnscoped } from "@/app/lib/db";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const rows = await prismaUnscoped.pharmacy
    .findMany({
      where: { status: { in: ["submitted", "under_review", "needs_info", "draft"] } },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    })
    .catch(() => []);

  return (
    <div>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
        Verification queue
      </h1>
      <p className="mt-2 text-sm text-teal-100/70">
        Drafts are owner-only. Submitted and needs-info rows need a human decision.
      </p>
      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-teal-100/60">
            <tr>
              <th className="px-4 py-3">Pharmacy</th>
              <th className="px-4 py-3">Licence</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-teal-100/50">
                  Queue is clear.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-white/5">
                <td className="px-4 py-3">
                  <Link href={`/platform/pharmacies/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-teal-100/50">/p/{p.slug}</p>
                </td>
                <td className="px-4 py-3 text-teal-100/80">{p.licenseNumber || "—"}</td>
                <td className="px-4 py-3 text-teal-100/80">{p.city || "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase">
                    {p.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
