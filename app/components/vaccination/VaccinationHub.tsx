"use client";

import { useMemo, useState } from "react";
import TenantLink from "../TenantLink";
import Link from "next/link";
import {
  ShieldCheck,
  Syringe,
  Plane,
  CalendarCheck,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  Clock,
  ThermometerSnowflake,
  FileText,
  Users,
  Stethoscope,
  Megaphone,
  HeartPulse,
  Baby,
} from "lucide-react";
import {
  VACCINE_CATEGORY_LABELS,
  ADULT_IMMUNIZATION_SCHEDULE,
  KEPI_CHILDHOOD_SCHEDULE,
  DEFAULT_IMMUNIZATION_POLICY,
  type VaccineCategory,
} from "@/app/lib/vaccination-catalog";
import { useTenantBrand } from "@/app/components/TenantBrand";

export type PublicVaccineCard = {
  id: string;
  slug: string;
  name: string;
  antigen: string;
  category: string;
  description: string;
  diseasesPrevented: string[];
  priceKes: number | null;
  pharmacyAdministered: boolean;
  bookable: boolean;
  travelRelated: boolean;
  seasonLabel: string | null;
  seriesDoses: number;
  durationHint?: string | null;
};

export type PublicCampaignCard = {
  slug: string;
  title: string;
  theme: string;
  short: string;
  startDate: string;
  endDate: string | null;
  walkInDays: string | null;
  targetPopulation: string;
  vaccinesOffered: string[];
  dosesAdministered: number;
  targetDoses: number | null;
};

export function VaccinationHub({
  vaccines,
  campaigns,
  policyDisclaimer,
}: {
  vaccines: PublicVaccineCard[];
  campaigns: PublicCampaignCard[];
  policyDisclaimer?: string | null;
}) {
  const [filter, setFilter] = useState<"all" | "bookable" | "travel" | "info">("all");
  const [tab, setTab] = useState<"vaccines" | "schedules" | "safety" | "campaigns">("vaccines");
  const brand = useTenantBrand();

  const filtered = useMemo(() => {
    return vaccines.filter((v) => {
      if (filter === "bookable") return v.pharmacyAdministered && v.bookable;
      if (filter === "travel") return v.travelRelated;
      if (filter === "info") return !v.pharmacyAdministered;
      return true;
    });
  }, [vaccines, filter]);

  const administered = vaccines.filter((v) => v.pharmacyAdministered).length;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Syringe, label: "Pharmacy-administered antigens", value: String(administered), hint: "Where locally authorised" },
          { icon: Clock, label: "Observation after every dose", value: "15 min", hint: "30 min if allergy history" },
          { icon: ThermometerSnowflake, label: "Cold-chain storage", value: "2–8°C", hint: "Monitored pharmaceutical fridge" },
          { icon: FileText, label: "Digital certificates", value: "Lot-traced", hint: "Portal immunisation card" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-white/60 bg-white p-4 shadow-[0_12px_40px_rgba(8,40,32,0.06)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white shadow-md">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[#0c1a14]">{s.value}</p>
              <p className="mt-0.5 text-sm font-medium text-[#0c1a14]">{s.label}</p>
              <p className="mt-1 text-xs text-[#5a6b62]">{s.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-amber-200/80 bg-amber-50/80 p-5 sm:p-6">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-amber-950">Depends on local authorisation</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
              {policyDisclaimer || DEFAULT_IMMUNIZATION_POLICY.publicDisclaimer}{" "}
              {brand.name} records lot numbers, consent, and immuniser credentials for every dose given on site.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["vaccines", "Vaccines", Syringe],
            ["schedules", "Schedules", CalendarCheck],
            ["safety", "Safety & consent", ShieldCheck],
            ["campaigns", "Health campaigns", Megaphone],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === id
                ? "bg-[#084c3f] text-white shadow-md"
                : "border border-teal-900/10 bg-white text-[#084c3f] hover:bg-teal-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "vaccines" && (
        <section>
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["bookable", "Book on site"],
                ["travel", "Travel"],
                ["info", "Information / referral"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  filter === id
                    ? "bg-teal-800 text-white"
                    : "border border-teal-900/10 bg-white text-[#084c3f]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {filtered.map((v) => (
              <article
                key={v.slug}
                className="flex h-full flex-col rounded-3xl border border-white/60 bg-white p-6 shadow-[0_16px_50px_rgba(8,40,32,0.07)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      {VACCINE_CATEGORY_LABELS[v.category as VaccineCategory] || v.category}
                      {v.seasonLabel ? ` · ${v.seasonLabel}` : ""}
                    </p>
                    <h3
                      className="mt-1 text-xl font-semibold text-[#0c1a14]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {v.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#5a6b62]">{v.antigen}</p>
                  </div>
                  {v.priceKes != null && v.priceKes > 0 ? (
                    <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-900">
                      KES {v.priceKes.toLocaleString()}
                    </span>
                  ) : v.pharmacyAdministered ? (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      Campaign / MoH
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      Info
                    </span>
                  )}
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[#5a6b62]">{v.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {v.diseasesPrevented.slice(0, 3).map((d) => (
                    <span
                      key={d}
                      className="rounded-full border border-teal-900/10 bg-[#f4f7f4] px-2 py-0.5 text-[11px] text-[#084c3f]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/vaccinations/${v.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800"
                  >
                    Vaccine information <ChevronRight className="h-4 w-4" />
                  </Link>
                  {v.bookable && v.pharmacyAdministered && (
                    <Link
                      href={`/vaccinations/book?vaccine=${v.slug}`}
                      className="btn-primary ml-auto inline-flex text-xs"
                    >
                      Book this vaccine
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "schedules" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-700" />
              <h3 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
                Adult & travel schedule
              </h3>
            </div>
            <ul className="mt-4 space-y-4">
              {ADULT_IMMUNIZATION_SCHEDULE.map((row) => (
                <li key={row.ageOrTrigger} className="border-b border-teal-900/5 pb-3 last:border-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{row.ageOrTrigger}</p>
                  <p className="mt-1 text-sm font-medium text-[#0c1a14]">{row.vaccines.join(" · ")}</p>
                  <p className="mt-1 text-xs text-[#5a6b62]">{row.note}</p>
                </li>
              ))}
            </ul>
            <TenantLink href="/vaccinations/schedule" className="mt-4 inline-flex text-sm font-semibold text-teal-800">
              Full schedule →
            </TenantLink>    </div>
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-teal-700" />
              <h3 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
                KEPI childhood schedule (information)
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#5a6b62]">
              Childhood vaccines in Kenya are given at public immunisation / MCH clinics. Bring the mother-child booklet.
              We review overdue doses and refer — we do not replace KEPI.
            </p>
            <ul className="mt-4 space-y-3">
              {KEPI_CHILDHOOD_SCHEDULE.map((row) => (
                <li key={row.age} className="flex gap-3 text-sm">
                  <span className="w-28 shrink-0 font-semibold text-[#084c3f]">{row.age}</span>
                  <span className="text-[#5a6b62]">{row.vaccines.join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === "safety" && (
        <section className="grid gap-4 md:grid-cols-2">
          {[
            {
              icon: FileText,
              title: "Vaccine information + consent",
              body: "You receive a product-specific information sheet, complete a contraindication questionnaire, and sign consent (self, parent/guardian, or caregiver) before any dose.",
            },
            {
              icon: ShieldCheck,
              title: "Certified immunisers",
              body: "Only staff with current immunisation certificates, anaphylaxis training, and (where required) a supervising pharmacist may administer.",
            },
            {
              icon: Clock,
              title: "15-minute observation",
              body: "You stay on site after every injection. Tell us immediately about breathing difficulty, rash, dizziness, or swelling.",
            },
            {
              icon: Stethoscope,
              title: "AEFI reporting",
              body: "Unexpected reactions are documented with lot number and reported to PPB / disease surveillance when indicated.",
            },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
                <Icon className="h-5 w-5 text-teal-700" />
                <h3 className="mt-3 text-base font-semibold text-[#0c1a14]">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{c.body}</p>
              </div>
            );
          })}
          <div className="md:col-span-2 rounded-3xl border border-teal-900/10 bg-[#f4fbf8] p-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#084c3f]">
              <Info className="h-4 w-4" /> When we will not vaccinate today
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-[#5a6b62] sm:grid-cols-2">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" /> Previous anaphylaxis to the same vaccine</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" /> Moderate/severe acute illness with fever</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" /> Live vaccine in pregnancy (we refer)</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" /> Antigen not authorised for pharmacy administration</li>
            </ul>
          </div>
        </section>
      )}

      {tab === "campaigns" && (
        <section className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="rounded-3xl border border-[#e3ebe6] bg-white px-6 py-12 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-teal-700" />
              <p className="mt-3 text-sm font-semibold text-[#0c1a14]">No public campaigns right now</p>
              <p className="mt-1 text-sm text-[#5a6b62]">
                Seasonal flu, outbreak, and awareness drives appear here when the pharmacy publishes them.
              </p>
            </div>
          ) : (
            campaigns.map((c) => {
              const progress =
                c.targetDoses && c.targetDoses > 0
                  ? Math.min(100, Math.round((c.dosesAdministered / c.targetDoses) * 100))
                  : null;
              return (
                <article
                  key={c.slug}
                  className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                    {c.theme.replace(/_/g, " ")} · {c.targetPopulation}
                  </p>
                  <h3
                    className="mt-1 text-xl font-semibold text-[#0c1a14]"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {c.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{c.short}</p>
                  <p className="mt-3 text-xs text-[#5a6b62]">
                    {new Date(c.startDate).toLocaleDateString()} 
                    {c.endDate ? ` – ${new Date(c.endDate).toLocaleDateString()}` : ""}
                    {c.walkInDays ? ` · Walk-ins: ${c.walkInDays}` : ""}
                  </p>
                  {progress != null && (
                    <div className="mt-3">
                      <div className="h-2 overflow-hidden rounded-full bg-teal-100">
                        <div className="h-full rounded-full bg-teal-700" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-[#5a6b62]">
                        {c.dosesAdministered} of {c.targetDoses} target doses
                      </p>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {c.vaccinesOffered.map((slug) => (
                      <Link
                        key={slug}
                        href={`/vaccinations/book?vaccine=${slug}&campaign=${c.slug}`}
                        className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900"
                      >
                        Book {slug.replace(/-/g, " ")}
                      </Link>
                    ))}
                  </div>
                </article>
              );
            })
          )}
          <div className="flex flex-wrap gap-3">
            <TenantLink href="/preventive" className="btn-primary inline-flex text-sm">
              <HeartPulse className="h-4 w-4" /> Preventive health & education
            </TenantLink>      <TenantLink href="/vaccinations/book" className="inline-flex items-center gap-2 rounded-full border border-teal-900/15 px-5 py-2.5 text-sm font-semibold text-[#084c3f]">
              Book any vaccine
            </TenantLink>    </div>
        </section>
      )}
    </div>
  );
}
