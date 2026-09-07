import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CtaBanner from "../components/CtaBanner";
import PageHero from "../components/PageHero";
import { articles, platform } from "../lib/data";
import styles from "./HealthSurface.module.css";

export const metadata: Metadata = {
  title: "Health Library",
  description: `Educational health articles from ${platform.name} pharmacists — medication safety, wellness, and seasonal advice.`,
  alternates: { canonical: "/health" },
};

export default function HealthLibraryPage() {
  const categories = Array.from(new Set(articles.map((a) => a.category)));

  return (
    <div className={styles.healthSurface}>
      <div className={styles.heroWrap}>
        <PageHero
          eyebrow="Health library"
          title="Clear health information you can use"
          description="Articles written and reviewed with community pharmacy practice in mind. For personal medical advice, speak with our pharmacists or your clinician."
          crumbs={[{ label: "Health Library" }]}
        />
      </div>

      <section className={styles.categorySection} aria-label="Health topics">
        <div className={styles.categoryRow}>
          {categories.map((c) => (
            <span key={c} className={styles.categoryChip}>
              {c}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.articleSection}>
        <div className={styles.articleGrid}>
          {articles.map((a) => (
            <Link key={a.slug} href={`/health/${a.slug}`} className={styles.articleCard}>
              <div className={styles.articleImage}>
                <Image
                  src={a.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 639px) 108px, (max-width: 1023px) 50vw, 33vw"
                />
              </div>
              <div className={styles.articleBody}>
                <p className={styles.articleMeta}>
                  {a.category} · {a.readTime} · {a.date}
                </p>
                <h2 className={styles.articleTitle}>{a.title}</h2>
                <p className={styles.articleExcerpt}>{a.excerpt}</p>
                <span className={styles.articleLink}>Read article →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <CtaBanner
        title="Have a health question?"
        description="Our pharmacists are available during open hours for counselling and product guidance."
      />
    </div>
  );
}
