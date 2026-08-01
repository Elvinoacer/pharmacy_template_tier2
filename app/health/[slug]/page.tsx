import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBanner from "../../components/CtaBanner";
import PageHero from "../../components/PageHero";
import { articles, getArticle } from "../../lib/data";

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
    <div>
      <PageHero
        eyebrow={article.category}
        title={article.title}
        description={article.excerpt}
        crumbs={[
          { label: "Health Library", href: "/health" },
          { label: article.title },
        ]}
      />

      <article className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-[1.5rem] shadow-lg">
            <Image
              src={article.image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[#5a6b62]">
            <span className="font-medium text-[#0c1a14]">{article.author}</span>
            <span aria-hidden>·</span>
            <time dateTime={article.date}>{article.date}</time>
            <span aria-hidden>·</span>
            <span>{article.readTime} read</span>
          </div>

          <div className="mt-8 space-y-5">
            {article.content.map((para, i) => (
              <p key={i} className="text-base leading-relaxed text-[#3d4f46]">
                {para}
              </p>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-5 text-sm text-amber-950">
            <strong className="font-semibold">Medical disclaimer:</strong> This article is for general education
            only and is not a substitute for professional medical advice, diagnosis, or treatment.
          </div>

          <Link href="/health" className="mt-8 inline-block text-sm font-semibold text-teal-800 hover:underline">
            ← Back to health library
          </Link>
        </div>

        {more.length > 0 && (
          <div className="mx-auto mt-16 max-w-6xl">
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Keep reading
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {more.map((a) => (
                <Link
                  key={a.slug}
                  href={`/health/${a.slug}`}
                  className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{a.category}</p>
                  <p className="mt-1 font-semibold text-[#0c1a14]">{a.title}</p>
                  <p className="mt-1 text-sm text-[#5a6b62] line-clamp-2">{a.excerpt}</p>
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
