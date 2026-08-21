import Link from "next/link";
import { prismaUnscoped } from "@/app/lib/db";

export const metadata = { title: "Pharmacies" };

export default async function PharmaciesAdminPage() {
  const rows = await prismaUnscoped.pharmacy
    .findMany({ orderBy: [{ featured: "desc" }, { name: "asc" }] })
    .catch(() => []);

  return (
    <div>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
        All pharmacies
      </h1>
      <div className="mt-8 grid gap-3">
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/platform/pharmacies/${p.id}`}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/8"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-teal-100/55">
                /p/{p.slug} · {[p.city, p.county].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] uppercase">
              {p.featured && <span className="text-amber-200">Featured</span>}
              {p.listed && <span className="text-emerald-300">Listed</span>}
              <span className="rounded-full border border-white/15 px-2 py-0.5">{p.status.replace("_", " ")}</span>
            </div>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-sm text-teal-100/60">No tenants yet.</p>}
      </div>
    </div>
  );
}
