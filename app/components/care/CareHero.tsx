import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, FileUp, HeartPulse, Pill, RotateCw } from "lucide-react";
import styles from "./CarePages.module.css";

export type CareSection = "medicines" | "services" | "prescription" | "refill";
const links = [
  { href: "/medicines", label: "Medicines", key: "medicines", Icon: Pill },
  {
    href: "/prescription",
    label: "Prescription",
    key: "prescription",
    Icon: FileUp,
  },
  { href: "/refill", label: "Refills", key: "refill", Icon: RotateCw },
  { href: "/services", label: "Services", key: "services", Icon: HeartPulse },
];
export default function CareHero({
  section,
  eyebrow,
  title,
  accent,
  description,
}: {
  section: CareSection;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
}) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <Link href="/" className={styles.crumb}>
          Aether / Your care, connected
        </Link>
        <p className={styles.kicker}>{eyebrow}</p>
        <h1>
          {title}
          <br />
          <em>{accent}</em>
        </h1>
        <p className={styles.intro}>{description}</p>
        <nav className={styles.tabs} aria-label="Explore care">
          {links.map(({ href, label, key, Icon }) => (
            <Link
              key={key}
              href={href}
              aria-current={section === key ? "page" : undefined}
            >
              <Icon size={15} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className={styles.heroPhoto}>
        <Image
          src={
            section === "services"
              ? "/images/care/editorial-pharmacy.png"
              : "/images/care/medicine-still-life.png"
          }
          alt=""
          fill
          priority
          sizes="(max-width: 700px) 100vw, 40vw"
          className={styles.cover}
        />
        <div className={styles.photoGlass}>
          <span className={styles.dot} />
          <span>
            {section === "services"
              ? "A little care. A lot of possibility."
              : "Your next step starts with availability."}
          </span>
          <ArrowUpRight size={18} aria-hidden />
        </div>
        <span className={styles.imageCredit}>Illustrative imagery</span>
      </div>
    </section>
  );
}
