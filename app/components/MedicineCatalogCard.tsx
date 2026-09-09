import Image from "next/image";
import TenantLink from "@/app/components/TenantLink";
import { formatPrice } from "@/app/lib/format";

/** Shape used by the public medicines grid (server catalog + image search). */
export type MedicineCatalogItem = {
  id: string;
  slug: string;
  price: number;
  currentStock: number;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  medicationMaster: {
    name: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
  };
};

export default function MedicineCatalogCard({
  item,
  badge,
}: {
  item: MedicineCatalogItem;
  /** Optional extra badge (e.g. match confidence from photo search). */
  badge?: string | null;
}) {
  const master = item.medicationMaster;
  const inStock = (item.currentStock ?? 0) > 0;

  return (
    <TenantLink
      href={`/medicines/${item.slug}`}
      className="card-lift group flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--card)] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand)_40%,var(--line-2))] hover:shadow-lg sm:rounded-3xl"
    >
      <div className="min-w-0">
        <div className="relative h-32 overflow-hidden bg-[var(--card-elev)] sm:h-36">
          {master.imageUrl ? (
            <Image
              src={master.imageUrl}
              alt={master.name}
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl opacity-30" aria-hidden>
              💊
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            {item.overTheCounter && (
              <span className="rounded-full bg-emerald-600/95 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                OTC
              </span>
            )}
            {item.prescriptionRequired && !item.overTheCounter && (
              <span className="rounded-full bg-amber-500/95 px-2.5 py-0.5 text-[10px] font-bold text-slate-950 shadow-sm">
                Rx
              </span>
            )}
          </div>

          {badge && (
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-[var(--brand-deep)]/90 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm">
              {badge}
            </span>
          )}
        </div>

        <div className="min-w-0 p-3 sm:p-4">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--brand)] sm:text-[10px]">
            {master.category ? master.category.replace(/-/g, " ") : "general"}
          </p>
          <h3 className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug text-[var(--foreground)] transition-colors group-hover:text-[var(--brand)] sm:text-sm">
            {master.name}
          </h3>
          {master.description && (
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)] sm:text-xs">
              {master.description}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--card-elev)] p-3 sm:p-4 sm:pt-3">
        <div className="flex min-w-0 items-end justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-[9px] font-medium text-[var(--muted-2)] sm:text-[10px]">Price</span>
            <span className="block truncate text-xs font-bold text-[var(--foreground)] sm:text-sm">
              KES {formatPrice(Number(item.price ?? 0))}
            </span>
          </div>

          <div className="shrink-0 text-right">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold sm:text-[11px] ${
                inStock ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-rose-500"}`} />
              {inStock ? `${item.currentStock} in stock` : "Out of stock"}
            </span>
          </div>
        </div>
      </div>
    </TenantLink>
  );
}

export function MedicineCatalogGrid({
  items,
  badges,
}: {
  items: MedicineCatalogItem[];
  badges?: Record<string, string | null | undefined>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((m) => (
        <MedicineCatalogCard key={m.id} item={m} badge={badges?.[m.id]} />
      ))}
    </div>
  );
}
