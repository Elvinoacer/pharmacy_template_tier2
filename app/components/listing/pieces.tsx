"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  CalendarCheck2,
  CheckCircle2,
  HeartPulse,
  Sparkles,
  Store,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  resolveMedicineImage,
  resolveServiceImage,
  resolvePharmacyCover,
  getCategoryAesthetic,
  DEFAULT_MEDICINE_IMAGE,
} from "@/app/lib/media-fallbacks";
import styles from "./listing.module.css";

export function PageHead({
  kicker,
  title,
  lede,
  aside,
}: {
  kicker: string;
  title: string;
  lede?: string;
  aside?: ReactNode;
}) {
  return (
    <header className={styles.pageHead}>
      <div>
        <p className={styles.kicker}>{kicker}</p>
        <h1>{title}</h1>
        {lede ? <p className={styles.lede}>{lede}</p> : null}
      </div>
      {aside ? <div className={styles.pageAside}>{aside}</div> : null}
    </header>
  );
}

export function Aisle({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.aisle}>
      <div className={styles.aisleHead}>
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function EmptyShelf({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {children}
    </div>
  );
}

/**
 * Resilient, client-side safe image renderer that never breaks.
 * Swaps to category or clinical fallback on error, and provides smooth load transitions.
 */
export function ResilientImage({
  src,
  fallbackSrc,
  alt,
  fill = true,
  sizes,
  priority = false,
  className = "object-cover",
  unoptimized = true,
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  fill?: boolean;
  sizes: string;
  priority?: boolean;
  className?: string;
  unoptimized?: boolean;
}) {
  const targetSrc = (src && src.trim()) ? src.trim() : (fallbackSrc || DEFAULT_MEDICINE_IMAGE);
  const [prevTargetSrc, setPrevTargetSrc] = useState(targetSrc);
  const [currentSrc, setCurrentSrc] = useState(targetSrc);
  const [failed, setFailed] = useState(false);
  const [allFailed, setAllFailed] = useState(false);

  if (targetSrc !== prevTargetSrc) {
    setPrevTargetSrc(targetSrc);
    setCurrentSrc(targetSrc);
    setFailed(false);
    setAllFailed(false);
  }

  if (allFailed) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/15 via-teal-500/8 to-cyan-500/15 p-2 text-center">
        <Sparkles className="h-6 w-6 text-[var(--brand)] opacity-60 animate-pulse" aria-hidden />
      </span>
    );
  }

  return (
    <Image
      unoptimized={unoptimized}
      src={currentSrc}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => {
        if (!failed && fallbackSrc && fallbackSrc !== currentSrc) {
          setFailed(true);
          setCurrentSrc(fallbackSrc);
        } else {
          setAllFailed(true);
        }
      }}
    />
  );
}

function Mark({
  name,
  imageUrl,
  fallbackUrl,
  imageAlt,
  frameClass,
  pad,
  fit = "cover",
  sizes,
  priority,
}: {
  name: string;
  imageUrl: string;
  fallbackUrl?: string;
  imageAlt: string;
  frameClass: string;
  pad?: boolean;
  fit?: "contain" | "cover";
  sizes: string;
  priority?: boolean;
}) {
  return (
    <span className={frameClass}>
      <span className={pad ? styles.shotPad : styles.frame}>
        <ResilientImage
          src={imageUrl}
          fallbackSrc={fallbackUrl}
          alt={imageAlt || name}
          sizes={sizes}
          priority={priority}
          className={fit === "contain" ? styles.shotImg : styles.coverImg}
        />
      </span>
    </span>
  );
}

export function MedicineFeature({
  href,
  compareHref,
  name,
  imageUrl,
  category,
  kicker,
  trust,
  priceLabel,
  meta,
  priority,
}: {
  href: string;
  compareHref?: string;
  name: string;
  imageUrl?: string | null;
  category?: string | null;
  kicker: string;
  trust: string;
  priceLabel: string;
  meta: string;
  priority?: boolean;
}) {
  const resolvedSrc = resolveMedicineImage(imageUrl, category || kicker, name);
  const fallbackSrc = resolveMedicineImage(null, category || kicker, name);

  return (
    <article className={styles.feature}>
      <Link href={href} className={styles.featureLink}>
        <div className={styles.featureFigure}>
          <Mark
            name={name}
            imageUrl={resolvedSrc}
            fallbackUrl={fallbackSrc}
            imageAlt={name}
            frameClass={styles.frame}
            pad={Boolean(imageUrl)}
            fit={imageUrl ? "contain" : "cover"}
            sizes="(max-width: 800px) 100vw, 360px"
            priority={priority}
          />
          <div className={styles.featureImageShade} aria-hidden />
          <span className={styles.spotlightBadge}>
            <Sparkles className="h-3 w-3" aria-hidden />
            Featured Care
          </span>
        </div>
        <span className={styles.featureBody}>
          <div className="flex items-center justify-between gap-2">
            <p className={styles.featureKicker}>{kicker}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-200" aria-hidden />
              In Stock
            </span>
          </div>
          <h2 className={styles.featureName}>{name}</h2>
          <p className={styles.trust}>{trust}</p>
          <div className="mt-auto pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className={styles.featurePrice}>{priceLabel}</p>
              <span className={styles.featureAction}>
                Reserve at counter <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
            {meta ? <p className={styles.featureMeta}>{meta}</p> : null}
          </div>
        </span>
      </Link>
      {compareHref ? (
        <Link href={compareHref} className={styles.compare}>
          Compare across network
        </Link>
      ) : null}
    </article>
  );
}

export function MedicineTile({
  href,
  name,
  imageUrl,
  category,
  priceLabel,
  meta,
  prescriptionRequired,
  priority = false,
  layout = "rail",
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
  category?: string | null;
  priceLabel: string;
  meta?: string;
  prescriptionRequired?: boolean;
  priority?: boolean;
  layout?: "rail" | "cell";
}) {
  const resolvedSrc = resolveMedicineImage(imageUrl, category, name);
  const fallbackSrc = resolveMedicineImage(null, category, name);

  const isRx = prescriptionRequired ?? (meta ? /prescription/i.test(meta) && !/no prescription/i.test(meta) : false);
  const isOtc = prescriptionRequired === false || (meta ? /no prescription|otc/i.test(meta) : false);
  const aesthetic = getCategoryAesthetic(category);

  return (
    <Link
      href={href}
      className={layout === "cell" ? styles.cell : styles.tile}
      style={{ "--category-glow": aesthetic.glow } as React.CSSProperties}
    >
      <span className={styles.shot}>
        <Mark
          name={name}
          imageUrl={resolvedSrc}
          fallbackUrl={fallbackSrc}
          imageAlt={name}
          frameClass={styles.frame}
          pad={Boolean(imageUrl)}
          fit={imageUrl ? "contain" : "cover"}
          sizes={layout === "cell" ? "(max-width: 640px) 45vw, 220px" : "160px"}
          priority={priority}
        />
        <span className={styles.shotShade} aria-hidden />
        {isRx ? (
          <span className={styles.badgeRx}>Rx</span>
        ) : isOtc ? (
          <span className={styles.badgeOtc}>No Rx</span>
        ) : null}
        <span className={styles.priceChip}>{priceLabel}</span>
      </span>
      <h3 className={styles.tileName}>{name}</h3>
      {meta ? <span className={styles.tileMeta}>{meta}</span> : null}
    </Link>
  );
}

export function ServicePoster({
  href,
  title,
  imageUrl,
  meta,
  action,
  priority,
  bookable,
}: {
  href: string;
  title: string;
  imageUrl?: string | null;
  meta: string;
  action: string;
  priority?: boolean;
  bookable?: boolean;
}) {
  const resolvedSrc = resolveServiceImage(imageUrl, title, meta);
  const fallbackSrc = resolveServiceImage(null, title, meta);
  const isBookable = bookable ?? /book/i.test(action);

  return (
    <Link href={href} className={styles.poster}>
      <Mark
        name={title}
        imageUrl={resolvedSrc}
        fallbackUrl={fallbackSrc}
        imageAlt={title}
        frameClass={styles.frame}
        fit="cover"
        sizes="(max-width: 900px) 80vw, 33vw"
        priority={priority}
      />
      <span className={styles.posterShade} aria-hidden />
      <div className={styles.posterTopBadges}>
        <span className={styles.posterBadge}>
          <HeartPulse className="h-3 w-3 text-teal-300" aria-hidden />
          Clinical Care
        </span>
        {isBookable ? (
          <span className={styles.bookBadge}>
            <CalendarCheck2 className="h-3 w-3" aria-hidden />
            Book Online
          </span>
        ) : null}
      </div>
      <span className={styles.posterBody}>
        <h2 className={styles.posterTitle}>{title}</h2>
        {meta ? <p className={styles.posterMeta}>{meta}</p> : null}
        <span className={styles.posterActionBtn}>
          {action}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </span>
    </Link>
  );
}

export function ServiceRow({
  href,
  title,
  imageUrl,
  meta,
  priceLabel,
}: {
  href: string;
  title: string;
  imageUrl?: string | null;
  meta: string;
  priceLabel: string;
}) {
  const resolvedSrc = resolveServiceImage(imageUrl, title, meta);
  const fallbackSrc = resolveServiceImage(null, title, meta);

  return (
    <Link href={href} className={styles.row}>
      <span className={styles.rowPhoto}>
        <ResilientImage
          src={resolvedSrc}
          fallbackSrc={fallbackSrc}
          alt={title}
          sizes="64px"
          className={styles.coverImg}
        />
      </span>
      <span className={styles.rowCopy}>
        <h3 className={styles.rowTitle}>{title}</h3>
        {meta ? <span className={styles.rowMeta}>{meta}</span> : null}
      </span>
      <span className={styles.rowPrice}>{priceLabel}</span>
    </Link>
  );
}

export function PharmacyPlace({
  href,
  name,
  imageUrl,
  imageAlt,
  logoUrl,
  featured,
  meta,
  actions,
  priority,
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
  imageAlt?: string;
  logoUrl?: string | null;
  featured?: boolean;
  meta: string;
  actions?: { href: string; label: string; external?: boolean }[];
  priority?: boolean;
}) {
  const resolvedCover = resolvePharmacyCover(imageUrl, name);

  return (
    <article className="min-w-0">
      <Link href={href} className={styles.place} data-photo="true">
        <Mark
          name={name}
          imageUrl={resolvedCover}
          fallbackUrl={resolvePharmacyCover(null, 1)}
          imageAlt={imageAlt || `${name} pharmacy interior`}
          frameClass={styles.frame}
          fit="cover"
          sizes="(max-width: 800px) 100vw, 1100px"
          priority={priority}
        />
        <span className={styles.placeShade} aria-hidden />
        <div className={styles.placeTopBadges}>
          {featured ? (
            <span className={styles.flag}>
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Verified Flagship
            </span>
          ) : (
            <span className={styles.flag}>
              <Store className="h-3 w-3" aria-hidden />
              Dispensary
            </span>
          )}
          {logoUrl ? (
            <span className={styles.logo}>
              <Image unoptimized src={logoUrl} alt="" fill sizes="40px" className={styles.shotImg} />
            </span>
          ) : null}
        </div>
        <span className={styles.placeBody}>
          <h2 className={styles.placeName}>{name}</h2>
          {meta ? <p className={styles.placeMeta}>{meta}</p> : null}
        </span>
      </Link>
      {actions && actions.length > 0 ? (
        <div className={styles.placeActions}>
          {actions.map((action) =>
            action.external ? (
              <a
                key={action.label}
                href={action.href}
                target={action.href.startsWith("http") ? "_blank" : undefined}
                rel={action.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {action.label}
              </a>
            ) : (
              <Link key={action.label} href={action.href}>
                {action.label}
              </Link>
            ),
          )}
        </div>
      ) : null}
    </article>
  );
}

export function PharmacyWindow({
  href,
  name,
  imageUrl,
  imageAlt,
  meta,
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
  imageAlt?: string;
  meta: string;
}) {
  const resolvedCover = resolvePharmacyCover(imageUrl, name);

  return (
    <Link href={href} className={styles.window} data-photo="true">
      <Mark
        name={name}
        imageUrl={resolvedCover}
        fallbackUrl={resolvePharmacyCover(null, 2)}
        imageAlt={imageAlt || name}
        frameClass={styles.frame}
        fit="cover"
        sizes="220px"
      />
      <span className={styles.windowShade} aria-hidden />
      <span className={styles.windowBody}>
        <h3 className={styles.windowName}>{name}</h3>
        {meta ? <p className={styles.windowMeta}>{meta}</p> : null}
      </span>
    </Link>
  );
}

export function PharmacyStreet({
  href,
  name,
  imageUrl,
  imageAlt,
  meta,
  callHref,
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
  imageAlt?: string;
  meta: string;
  callHref?: string | null;
}) {
  const resolvedCover = resolvePharmacyCover(imageUrl, name);

  return (
    <article className={styles.street}>
      <Link href={href} className={styles.streetMain}>
        <span className={styles.streetPhoto}>
          <ResilientImage
            src={resolvedCover}
            fallbackSrc={resolvePharmacyCover(null, 3)}
            alt={imageAlt || name}
            sizes="72px"
            className={styles.coverImg}
          />
        </span>
        <span className={styles.streetCopy}>
          <h3 className={styles.streetName}>{name}</h3>
          {meta ? <span className={styles.streetMeta}>{meta}</span> : null}
        </span>
      </Link>
      {callHref ? (
        <a className={styles.call} href={callHref}>
          Call
        </a>
      ) : null}
    </article>
  );
}
