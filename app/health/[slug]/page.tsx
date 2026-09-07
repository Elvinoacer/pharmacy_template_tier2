import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBanner from "../../components/CtaBanner";
import PageHero from "../../components/PageHero";
import { articles, getArticle } from "../../lib/data";
import styles from "../HealthSurface.module.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article" };
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/health/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [{ url: article.image }],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const related = articles.filter((a) => a.slug !== article.slug && a.category === article.category).slice(0, 2);
  const more = related.length
    ? related
    : articles.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <div className={styles.healthSurface}>
      <div className={styles.heroWrap}>
        <PageHero
          eyebrow={article.category}
          title={article.title}
          description={article.excerpt}
          crumbs={[
            { label: "Health Library", href: "/health" },
            { label: article.title },
          ]}
        />
      </div>

      <article className={styles.articlePage}>
        <div className={styles.articleMain}>
          <div className={styles.leadImage}>
            <Image
              src={article.image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) calc(100vw - 48px), 768px"
              priority
            />
          </div>

          <div className={styles.authorBar}>
            <strong>{article.author}</strong>
            <span aria-hidden>·</span>
            <time dateTime={article.date}>{article.date}</time>
            <span aria-hidden>·</span>
            <span>{article.readTime} read</span>
          </div>

          <div className={styles.articleCopy}>
            {article.content.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <div className={styles.disclaimer}>
            <strong className="font-semibold">Medical disclaimer:</strong> This article is for general education
            only and is not a substitute for professional medical advice, diagnosis, or treatment.
          </div>

          <Link href="/health" className={styles.backLink}>
            ← Back to health library
          </Link>
        </div>

        {more.length > 0 && (
          <div className={styles.moreSection}>
            <h2 className={styles.moreTitle}>Keep reading</h2>
            <div className={styles.moreGrid}>
              {more.map((a) => (
                <Link key={a.slug} href={`/health/${a.slug}`} className={styles.moreCard}>
                  <p className={styles.moreMeta}>{a.category}</p>
                  <p className={styles.moreCardTitle}>{a.title}</p>
                  <p className={styles.moreExcerpt}>{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <CtaBanner />
    </div>
  );
}
