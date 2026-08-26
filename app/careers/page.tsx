import type { Metadata } from "next";
import CareerForm from "../components/CareerForm";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import StorefrontUnavailable from "@/app/components/StorefrontUnavailable";
import { getStorefrontView } from "@/app/lib/services/storefront-content";

export const metadata: Metadata = {
  title: "Careers",
  description: `Join a ${platform.name} pharmacy team — open roles across Kenya.`,
  alternates: { canonical: "/careers" },
};

export default async function CareersPage() {
  const view = await getStorefrontView();
  if (view.status === "unavailable") {
    return <StorefrontUnavailable slug={view.slug} next="/careers" />;
  }
  if (view.status !== "active") return <ChoosePharmacy next="/careers" />;

  const pharmacy = view.resolved;
  const careers = view.content.careers;

  return (
    <div>
      <PageHero
        eyebrow="Careers"
        title={careers.heading}
        description={careers.description}
        crumbs={[{ label: "Careers" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            {careers.jobs.map((job) => (
              <article
                key={job.id}
                id={job.id}
                className="glass-panel-strong rounded-3xl p-6"
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

          <div className="glass-panel-strong relative h-fit rounded-3xl p-6 sm:p-8 lg:sticky lg:top-28">
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
              <a href={`mailto:${pharmacy.careersEmail || pharmacy.email}`} className="font-semibold text-teal-800">
                {pharmacy.careersEmail || pharmacy.email}
              </a>{" "}
              with the subject “Careers”.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
