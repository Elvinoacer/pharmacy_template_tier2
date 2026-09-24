import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./listing.module.css";

const MEDICINE_FALLBACK = "/images/care/medicine-still-life.png";
const CARE_FALLBACK = "/images/care/editorial-pharmacy.png";

export function shelfPrice(value: number | null | undefined, compact = true) {
  if (value == null || !Number.isFinite(value) || value <= 0) return compact ? "Ask" : "Ask the pharmacy";
  return `KES ${Math.round(value).toLocaleString("en-KE")}`;
}

export function joinMeta(parts: Array<string | null | undefined | false>) {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}

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

function Mark({
  name,
  imageUrl,
  imageAlt,
  frameClass,
  pad,
  fit,
  sizes,
  priority,
}: {
  name: string;
  imageUrl: string | null;
  imageAlt: string;
  frameClass: string;
  pad?: boolean;
  fit: "contain" | "cover";
  sizes: string;
  priority?: boolean;
}) {
  return (
    <span className={frameClass}>
      {imageUrl ? (
        <span className={pad ? styles.shotPad : styles.frame}>
          <Image
            unoptimized
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes={sizes}
            priority={priority}
            className={fit === "cover" ? styles.coverImg : styles.shotImg}
          />
        </span>
      ) : (
        <span className={styles.monogram} aria-hidden="true">
          {name.trim().charAt(0).toUpperCase() || "A"}
        </span>
      )}
    </span>
  );
}

export function MedicineFeature({
  href,
  compareHref,
  name,
  imageUrl,
  kicker,
  trust,
  priceLabel,
  meta,
  priority,
}: {
  href: string;
  compareHref?: string;
  name: string;
  imageUrl: string | null;
  kicker: string;
  trust: string;
  priceLabel: string;
  meta: string;
  priority?: boolean;
}) {
  const src = imageUrl || MEDICINE_FALLBACK;
  return (
    <article className={styles.feature}>
      <Link href={href} className={styles.featureLink}>
        <Mark
          name={name}
          imageUrl={src}
          imageAlt={imageUrl ? name : ""}
          frameClass={styles.featureFigure}
          pad
          fit="contain"
          sizes="(max-width: 800px) 118px, 220px"
          priority={priority}
        />
        <span className={styles.featureBody}>
          <p className={styles.featureKicker}>{kicker}</p>
          <h2 className={styles.featureName}>{name}</h2>
          <p className={styles.trust}>{trust}</p>
          <p className={styles.featurePrice}>{priceLabel}</p>
          <p className={styles.featureMeta}>{meta}</p>
        </span>
      </Link>
      {compareHref ? (
        <Link href={compareHref} className={styles.compare}>
          Compare
        </Link>
      ) : null}
    </article>
  );
}

export function MedicineTile({
  href,
  name,
  imageUrl,
  priceLabel,
  meta,
  layout = "rail",
}: {
  href: string;
  name: string;
  imageUrl: string | null;
  priceLabel: string;
  meta?: string;
  layout?: "rail" | "cell";
}) {
  const src = imageUrl || MEDICINE_FALLBACK;
  return (
    <Link href={href} className={layout === "cell" ? styles.cell : styles.tile}>
      <span className={styles.shot}>
        <Mark
          name={name}
          imageUrl={src}
          imageAlt={imageUrl ? name : ""}
          frameClass={styles.frame}
          pad
          fit="contain"
          sizes="146px"
        />
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
}: {
  href: string;
  title: string;
  imageUrl: string | null;
  meta: string;
  action: string;
  priority?: boolean;
}) {
  return (
    <Link href={href} className={styles.poster}>
      <Mark
        name={title}
        imageUrl={imageUrl || CARE_FALLBACK}
        imageAlt={imageUrl ? title : ""}
        frameClass={styles.frame}
        fit="cover"
        sizes="(max-width: 900px) 78vw, 33vw"
        priority={priority}
      />
      <span className={styles.posterShade} aria-hidden />
      <span className={styles.posterBody}>
        <h2 className={styles.posterTitle}>{title}</h2>
        {meta ? <p className={styles.posterMeta}>{meta}</p> : null}
        <p className={styles.posterAction}>{action}</p>
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
  imageUrl: string | null;
  meta: string;
  priceLabel: string;
}) {
  return (
    <Link href={href} className={styles.row}>
      <Mark
        name={title}
        imageUrl={imageUrl || CARE_FALLBACK}
        imageAlt={imageUrl ? title : ""}
        frameClass={styles.rowPhoto}
        fit="cover"
        sizes="56px"
      />
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
  imageUrl: string | null;
  imageAlt: string;
  logoUrl?: string | null;
  featured?: boolean;
  meta: string;
  actions?: { href: string; label: string; external?: boolean }[];
  priority?: boolean;
}) {
  const photo = Boolean(imageUrl);
  return (
    <article>
      <Link href={href} className={styles.place} data-photo={photo ? "true" : "false"}>
        {photo ? (
          <Mark
            name={name}
            imageUrl={imageUrl}
            imageAlt={imageAlt}
            frameClass={styles.frame}
            fit="cover"
            sizes="(max-width: 800px) 100vw, 1100px"
            priority={priority}
          />
        ) : (
          <span className={styles.watermark} aria-hidden>
            {name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className={styles.placeShade} aria-hidden />
        {featured ? <span className={styles.flag}>Featured</span> : null}
        {logoUrl ? (
          <span className={styles.logo}>
            <Image unoptimized src={logoUrl} alt="" fill sizes="40px" className={styles.shotImg} />
          </span>
        ) : null}
        <span className={styles.placeBody}>
          <h2 className={styles.placeName}>{name}</h2>
          {meta ? <p className={styles.placeMeta}>{meta}</p> : null}
        </span>
      </Link>
      {actions && actions.length > 0 ? (
        <div className={styles.placeActions}>
          {actions.map((action) =>
            action.external ? (
              <a key={action.label} href={action.href} target={action.href.startsWith("http") ? "_blank" : undefined} rel={action.href.startsWith("http") ? "noopener noreferrer" : undefined}>
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
  imageUrl: string | null;
  imageAlt: string;
  meta: string;
}) {
  return (
    <Link href={href} className={styles.window} data-photo={imageUrl ? "true" : "false"}>
      {imageUrl ? (
        <Mark name={name} imageUrl={imageUrl} imageAlt={imageAlt} frameClass={styles.frame} fit="cover" sizes="210px" />
      ) : (
        <span className={styles.watermark} aria-hidden>
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
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
  imageUrl: string | null;
  imageAlt: string;
  meta: string;
  callHref?: string | null;
}) {
  return (
    <article className={styles.street}>
      <Link href={href} className={styles.streetMain}>
        <Mark name={name} imageUrl={imageUrl} imageAlt={imageAlt} frameClass={styles.streetPhoto} fit="cover" sizes="72px" />
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
