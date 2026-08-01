import type { Metadata } from "next";
import CareerForm from "../components/CareerForm";
import PageHero from "../components/PageHero";
import { jobs, pharmacy } from "../lib/data";

export const metadata: Metadata = {
  title: "Careers",
  description: `Join the ${pharmacy.name} team — open roles, internships, and graduate opportunities in Austin.`,
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <div>
      <PageHero
        eyebrow="Careers"
        title="Build a career in community pharmacy"
        description="We are looking for people who care about accuracy, kindness, and local health. Browse open roles or send a general application."
        crumbs={[{ label: "Careers" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            {jobs.map((job) => (
              <article
                key={job.id}
                id={job.id}
                className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    {job.type}
                  </span>
                  <span className="text-xs text-[#5a6b62]">{job.location}</span>
                  <span className="text-xs text-[#5a6b62]">Posted {job.posted}</span>
                </div>
                <h2
                  className="mt-3 text-xl font-semibold text-[#0c1a14]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {job.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{job.summary}</p>
                <h3 className="mt-4 text-sm font-semibold text-[#0c1a14]">Requirements</h3>
                <ul className="mt-2 space-y-1.5">
                  {job.requirements.map((r) => (
                    <li key={r} className="flex gap-2 text-sm text-[#5a6b62]">
                      <span className="text-teal-700">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="relative h-fit rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm sm:p-8 lg:sticky lg:top-28">
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Apply now
            </h2>
            <p className="mt-2 text-sm text-[#5a6b62]">
              Upload your CV and tell us which role interests you. We review applications regularly.
            </p>
            <div className="relative mt-6">
              <CareerForm />
            </div>
            <p className="mt-4 text-xs text-[#5a6b62]">
              Or email{" "}
              <a href={`mailto:${pharmacy.email}`} className="font-semibold text-teal-800">
                {pharmacy.email}
              </a>{" "}
              with the subject “Careers”.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
