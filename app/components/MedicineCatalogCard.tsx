import Image from "next/image";
import Link from "next/link";
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
    <Link
      href={`/medicines/${item.slug}`}
      className="card-lift group overflow-hidden rounded-2xl border border-[#e3ebe6] bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative h-32 overflow-hidden bg-[#f4f7f4]">
        {master.imageUrl ? (
          <Image
            src={master.imageUrl}
            alt={master.name}
            fill
            className="object-cover transition duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl" aria-hidden>
            💊
          </div>
        )}
        {item.overTheCounter && (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
            OTC
          </span>
        )}
        {item.prescriptionRequired && !item.overTheCounter && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
            Rx required
          </span>
        )}
        {badge && (
          <span className="absolute bottom-2 right-2 rounded-full bg-[#0d6e5a]/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d6e5a]">
          {master.category ? master.category.replace(/-/g, " ") : "general"}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-[#0c1a14]">{master.name}</h3>
        {master.description && (
          <p className="mt-1 line-clamp-2 text-xs text-[#5a6b62]">{master.description}</p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold text-[#0c1a14]">
            KES {formatPrice(Number(item.price ?? 0))}
          </span>
          <span className={`text-[10px] ${inStock ? "text-emerald-700" : "text-rose-600"}`}>
            {inStock ? `${item.currentStock} in stock` : "out of stock"}
          </span>
        </div>
      </div>
    </Link>
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
