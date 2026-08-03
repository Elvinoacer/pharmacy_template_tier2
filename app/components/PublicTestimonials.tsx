import { prisma } from "@/app/lib/db";
import { Star } from "lucide-react";
import { formatDateTime } from "@/app/lib/time";

/**
 * Public testimonials — pulls feedback where staff have marked `isPublic=true`
 * AND responded. Renders up to 6 most recent on the public site.
 *
 * This is the "Appears on public" checkbox working end-to-end: staff check it
 * in /admin/feedback, the feedback is then shown here.
 */
export async function PublicTestimonials({ limit = 6 }: { limit?: number }) {
  let items: Array<{
    id: string;
    name: string | null;
    rating: number | null;
    title: string | null;
    body: string;
    staffResponse: string | null;
    createdAt: Date;
  }> = [];

  try {
    items = await prisma.feedback.findMany({
      where: {
        isPublic: true,
        status: "responded",
        staffResponse: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    // DB might not be migrated yet — render nothing rather than crash.
    return null;
  }

  if (items.length === 0) return null;

  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Testimonials</p>
          <h2
            className="mt-2 text-2xl font-semibold text-[#0c1a14] sm:text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            What our customers say
          </h2>
          <p className="mt-2 text-sm text-[#5a6b62]">
            Real feedback from real customers, shared with their permission.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <figure
              key={f.id}
              className="flex flex-col gap-3 rounded-2xl border border-[#e3ebe6] bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              {f.rating && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < f.rating! ? "fill-amber-400 text-amber-500" : "text-slate-300"}`}
                    />
                  ))}
                </div>
              )}
              {f.title && (
                <p className="text-sm font-semibold text-[#0c1a14]">{f.title}</p>
              )}
              <blockquote className="flex-1 text-sm leading-relaxed text-[#5a6b62]">
                &ldquo;{f.body}&rdquo;
              </blockquote>
              {f.staffResponse && (
                <div className="rounded-xl bg-[#f0faf6] px-3 py-2 text-xs text-[#084c3f]">
                  <p className="font-semibold">Pharmacy response:</p>
                  <p className="mt-0.5 line-clamp-3">{f.staffResponse}</p>
                </div>
              )}
              <figcaption className="flex items-center justify-between text-xs text-[#8a9a92]">
                <span className="font-medium text-[#0c1a14]">{f.name || "Anonymous"}</span>
                <time>{formatDateTime(f.createdAt)}</time>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
