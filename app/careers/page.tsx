import type { Metadata } from "next";
import { ArrowDownRight, BriefcaseBusiness, CheckCircle2, Clock3, MapPin } from "lucide-react";
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
  const roles = careers.jobs.map((job) => ({ id: job.id, title: job.title }));

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Careers"
        title={careers.heading}
        description={careers.description}
        crumbs={[{ label: "Careers" }]}
      />

      <section className="px-3 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)] lg:items-start lg:gap-8 xl:gap-10">
          <div className="min-w-0 space-y-3.5 sm:space-y-5">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">Open positions</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)] sm:text-sm">
                  {careers.jobs.length} {careers.jobs.length === 1 ? "role" : "roles"} currently listed
                </p>
              </div>
              <BriefcaseBusiness className="h-5 w-5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            </div>

            {careers.jobs.map((job) => (
              <article
                key={job.id}
                id={job.id}
                className="min-w-0 scroll-mt-28 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm transition-colors duration-300 sm:rounded-3xl sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-7 items-center rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand)]">
                    {job.type}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-[var(--muted)] sm:text-xs">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                    <span className="break-words">{job.location}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] sm:text-xs">
                    <Clock3 className="h-3.5 w-3.5 shrink-0 text-[var(--muted-2)]" aria-hidden="true" />
                    Posted {job.posted}
                  </span>
                </div>

                <h2
                  className="mt-3 break-words text-lg font-semibold leading-tight text-[var(--foreground)] sm:text-xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {job.title}
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-[var(--muted)] sm:text-sm sm:leading-relaxed">{job.summary}</p>

                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--card-elev)] p-3.5 sm:rounded-2xl sm:p-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--foreground)] sm:text-sm sm:normal-case sm:tracking-normal">
                    Requirements
                  </h3>
                  <ul className="mt-2.5 space-y-2">
                    {job.requirements.map((requirement) => (
                      <li key={requirement} className="flex min-w-0 items-start gap-2.5 text-[13px] leading-5 text-[var(--muted)] sm:text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                        <span className="min-w-0 break-words">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href="#apply"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-4 text-sm font-semibold text-[var(--brand)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:w-auto"
                >
                  Apply for this role
                  <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
            ))}

            {careers.jobs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--card)] p-6 text-center sm:p-8">
                <p className="text-sm font-semibold text-[var(--foreground)]">No open roles right now</p>
                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[var(--muted)] sm:text-sm">
                  You can still send a general application and the pharmacy can keep your details for future opportunities.
                </p>
              </div>
            )}
          </div>

          <aside
            id="apply"
            className="min-w-0 scroll-mt-24 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm transition-colors duration-300 sm:rounded-3xl sm:p-6 lg:sticky lg:top-28 lg:p-7 xl:p-8"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">Application</p>
            <h2
              className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Apply now
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)] sm:text-sm">
              Upload your CV and tell us which role interests you. We review applications regularly.
            </p>
            <div className="relative mt-5 min-w-0 sm:mt-6">
              <CareerForm roles={roles} />
            </div>
            <p className="mt-5 break-words border-t border-[var(--line)] pt-4 text-xs leading-5 text-[var(--muted)]">
              Prefer email? Send your CV to{" "}
              <a
                href={`mailto:${pharmacy.careersEmail || pharmacy.email}?subject=Careers`}
                className="break-all font-semibold text-[var(--brand)] underline-offset-2 hover:underline"
              >
                {pharmacy.careersEmail || pharmacy.email}
              </a>
              .
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
