"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import {
  ArrowUpRight,
  CalendarCheck2,
  Check,
  Clock3,
  MapPin,
  Sparkles,
  Store,
} from "lucide-react";
import { resolveServiceImage } from "@/app/lib/media-fallbacks";
import { ResilientImage } from "@/app/components/listing/pieces";
import styles from "./ServicesPage.module.css";

type Props = {
  href: string;
  title: string;
  short: string;
  imageUrl: string | null;
  bookable: boolean;
  duration: string | null;
  priceLabel: string | null;
  benefitCount: number;
  featured?: boolean;
  pharmacy?: {
    name: string;
    city?: string | null;
    county?: string | null;
  } | null;
};

export default function ServiceCardLink({
  href,
  title,
  short,
  imageUrl,
  bookable,
  duration,
  priceLabel,
  benefitCount,
  featured = false,
  pharmacy = null,
}: Props) {
  const [opening, setOpening] = useState(false);
  const location = pharmacy
    ? [pharmacy.city, pharmacy.county].filter(Boolean).join(", ")
    : "";

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      setOpening(true);
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-busy={opening}
      aria-label={pharmacy ? `Open ${title} at ${pharmacy.name}` : `Open ${title}`}
      className={`${styles.serviceCard} ${featured ? styles.featuredCard : ""} ${opening ? styles.cardOpening : ""}`}
    >
      <div className={styles.cardMedia}>
        <ResilientImage
          src={resolveServiceImage(imageUrl, title, short)}
          fallbackSrc={resolveServiceImage(null, title, short)}
          alt={title}
          className={styles.cardImage}
          sizes={featured ? "(max-width: 760px) 100vw, 58vw" : "(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 33vw"}
        />
        <div className={styles.cardMediaShade} aria-hidden="true" />

        <div className={styles.cardBadges}>
          {bookable && (
            <span className={styles.bookableBadge}>
              <CalendarCheck2 className="h-3 w-3" aria-hidden="true" />
              Book online
            </span>
          )}
          {priceLabel && <span className={styles.priceBadge}>{priceLabel}</span>}
        </div>

        <span className={styles.imageAction} aria-hidden="true">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className={styles.cardContent}>
        <div>
          {featured && <p className={styles.featuredLabel}>A good place to start</p>}
          <h3>{title}</h3>
          <p className={styles.cardDescription}>{short}</p>
        </div>

        {pharmacy && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--brand-tint)]/65 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--card)] text-[var(--brand)] shadow-sm">
                <Store className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-bold text-[var(--foreground)] sm:text-xs">
                  {pharmacy.name}
                </span>
                {location && (
                  <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] text-[var(--muted)]">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{location}</span>
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        <div className={styles.cardMeta}>
          {duration && (
            <span>
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {duration}
            </span>
          )}
          {benefitCount > 0 && (
            <span>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {benefitCount} benefit{benefitCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className={styles.cardFooter}>
          <span className={styles.openLabel}>
            {opening ? "Opening service…" : bookable ? "View & book" : "View service"}
          </span>
          <span className={styles.openButton} aria-hidden="true">
            {opening ? <span className={styles.openingDot} /> : <ArrowUpRight className="h-4 w-4" />}
          </span>
        </div>
      </div>
    </Link>
  );
}
