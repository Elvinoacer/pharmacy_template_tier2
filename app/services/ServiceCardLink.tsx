"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type MouseEvent } from "react";
import {
  ArrowUpRight,
  CalendarCheck2,
  Check,
  Clock3,
  Sparkles,
} from "lucide-react";
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
}: Props) {
  const [opening, setOpening] = useState(false);

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
      aria-label={`Open ${title}`}
      className={`${styles.serviceCard} ${featured ? styles.featuredCard : ""} ${
        opening ? styles.cardOpening : ""
      }`}
    >
      <div className={styles.cardMedia}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className={styles.cardImage}
            sizes={featured ? "(max-width: 760px) 100vw, 58vw" : "(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 33vw"}
          />
        ) : (
          <div className={styles.cardFallback} aria-hidden="true">
            <Sparkles className="h-8 w-8" />
          </div>
        )}
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
