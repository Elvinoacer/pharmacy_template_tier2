import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import styles from "./care/CarePages.module.css";
import TenantLink from "@/app/components/TenantLink";
import { formatPrice } from "@/app/lib/format";

/** Shape used by the public medicines grid (server catalog + image search). */
export type MedicineCatalogItem = {
  id: string;
  slug: string;
  /** Explicit pharmacy-aware destination for network catalogue cards. */
  href?: string;
  price: number;
  currentStock: number;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  pharmacy?: {
    slug: string;
    name: string;
    city?: string | null;
    county?: string | null;
    logoUrl?: string | null;
  } | null;
  medicationMaster: {
    name: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
  };
};

export default function MedicineCatalogCard({item,badge}:{item:MedicineCatalogItem;badge?:string|null}) {
  const master=item.medicationMaster;const inStock=item.currentStock>0;const href=item.href||`/medicines/${item.slug}`;
  return <article className={styles.serviceCard}>
    <TenantLink href={href} className={styles.medicineImage} aria-label={`View ${master.name}`}><Image src={master.imageUrl||"/images/care/medicine-still-life.png"} alt={master.imageUrl?master.name:""} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" /><span className={styles.badge}>{item.prescriptionRequired&&!item.overTheCounter?"Prescription required":"OTC"}</span>{!master.imageUrl&&<span className={styles.imageCredit}>Illustrative image</span>}</TenantLink>
    <div className={styles.medicineBody}><span className={styles.medicineCategory}>{master.category?.replace(/-/g," ")||"Medicine"}</span><TenantLink href={href}><h3>{master.name}</h3></TenantLink>{badge&&<p>{badge}</p>}<span className={styles.medicineStock} data-stock={inStock}>{inStock?"Listed in stock":"Currently unavailable"}</span>{item.pharmacy&&<Link href={`/pharmacies/${item.pharmacy.slug}`} className={styles.provider}>About {item.pharmacy.name}<ArrowUpRight size={12} aria-hidden /></Link>}<TenantLink href={href} className={styles.serviceFoot}><strong>KES {formatPrice(Number(item.price))}</strong><ArrowRight size={16} aria-hidden /></TenantLink></div>
  </article>;
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
