import Image from "next/image";
import Link from "next/link";
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
      className="card-lift group flex flex-col justify-between overflow-hidden rounded-3xl glass-panel shadow-xs transition duration-300 hover:border-teal-500/40 hover:shadow-lg"
    >
      <div>
        <div className="relative h-36 overflow-hidden bg-[#f4f7f4]">
          {master.imageUrl ? (
            <Image
              src={master.imageUrl}
              alt={master.name}
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl opacity-30" aria-hidden>
              💊
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            {item.overTheCounter && (
              <span className="rounded-full bg-emerald-600/95 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                OTC
              </span>
            )}
            {item.prescriptionRequired && !item.overTheCounter && (
              <span className="rounded-full bg-amber-500/95 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                Rx
              </span>
            )}
          </div>

          {badge && (
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-teal-900/90 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
              {badge}
            </span>
          )}
        </div>

        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
            {master.category ? master.category.replace(/-/g, " ") : "general"}
          </p>
          <h3 className="mt-1 text-sm font-bold text-[#0c1a14] group-hover:text-teal-800 transition-colors line-clamp-2">
            {master.name}
          </h3>
          {master.description && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#5a6b62]">
              {master.description}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--line)] p-4 pt-3 bg-[var(--card-elev)]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-[#8a9a92] block">Price</span>
            <span className="text-sm font-bold text-[#0c1a14]">
              KES {formatPrice(Number(item.price ?? 0))}
            </span>
          </div>

          <div className="text-right">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${inStock ? "text-emerald-700" : "text-rose-600"}`}>
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((m) => (
        <MedicineCatalogCard key={m.id} item={m} badge={badges?.[m.id]} />
      ))}
    </div>
  );
}
