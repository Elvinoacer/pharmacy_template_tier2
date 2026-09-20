"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useTenantSlug } from "../TenantLink";
import {
  bookCounsellingAction,
  type VaccinationActionState,
} from "@/app/actions/vaccination";
import { toast } from "@/app/components/Toaster";
import {
  COUNSELLING_TOPICS,
  PUBLIC_HEALTH_EDUCATION,
} from "@/app/lib/vaccination-catalog";
import {
  BookOpen,
  CheckCircle2,
  HeartPulse,
  Loader2,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function PreventiveHealthHub({
  campaigns,
  defaultName = "",
  defaultPhone = "",
  pharmacySlug: pharmacySlugProp,
  pharmacies = [],
}: {
  campaigns: Array<{
    slug: string;
    title: string;
    theme: string;
    short: string;
    startDate: string;
    endDate: string | null;
    walkInDays: string | null;
    targetPopulation: string;
  }>;
  defaultName?: string;
  defaultPhone?: string;
  pharmacySlug?: string;
  pharmacies?: Array<{ slug: string; name: string; city?: string | null }>;
}) {
  const tenantSlug = useTenantSlug();
  const activeSlug = pharmacySlugProp || tenantSlug || "";
  const [tab, setTab] = useState<"counselling" | "campaigns" | "education">("counselling");
  const [topic, setTopic] = useState(COUNSELLING_TOPICS[0]?.slug || "immunization_education");
  const [state, formAction, pending] = useActionState(bookCounsellingAction, {} as VaccinationActionState);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  const selected = COUNSELLING_TOPICS.find((t) => t.slug === topic) || COUNSELLING_TOPICS[0];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: MessageCircle, title: "Preventive counselling", body: "Travel, cessation, heart risk, malaria, immunisation education — 20–30 minutes with a pharmacist." },
          { icon: Megaphone, title: "Health campaigns", body: "Flu season, outbreak response, diabetes month, and community education drives." },
          { icon: BookOpen, title: "Public-health education", body: "Plain-language articles on vaccines, AEFI, travel, and year-round prevention." },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className="liquid-glass care-glass rounded-3xl border border-[var(--health-ui-border)] bg-[var(--care-glass)] p-5 shadow-sm backdrop-blur-xl">
              <Icon className="h-5 w-5 text-[var(--brand)]" />
              <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{c.body}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["counselling", "Counselling", HeartPulse],
            ["campaigns", "Campaigns", Megaphone],
            ["education", "Education", BookOpen],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === id ? "bg-[var(--brand)] text-[var(--background)] shadow-sm" : "border border-[var(--health-ui-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--card-elev)]"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "counselling" && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {COUNSELLING_TOPICS.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setTopic(t.slug)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  topic === t.slug ? "border-[var(--brand)] bg-[var(--brand-soft)]" : "border-[var(--health-ui-border)] bg-[var(--card)] hover:border-[var(--brand)]"
                }`}
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">{t.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{t.summary}</p>
                <p className="mt-2 text-[11px] font-semibold text-[var(--brand-deep)]">{t.durationMinutes} minutes</p>
              </button>
            ))}
          </div>
          <div className="liquid-glass care-glass rounded-3xl border border-[var(--health-ui-border)] bg-[var(--care-glass)] p-6 shadow-sm backdrop-blur-xl lg:sticky lg:top-28 h-fit">
            {state?.success ? (
              <div>
                <CheckCircle2 className="h-8 w-8 text-teal-700" />
                <p className="mt-3 text-sm font-semibold text-[#0c1a14]">{state.success}</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Book a session</p>
                <h3 className="mt-1 text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
                  {selected.title}
                </h3>
                <ul className="mt-3 space-y-1.5 text-xs text-[#5a6b62]">
                  {selected.goals.map((g) => (
                    <li key={g} className="flex gap-2">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-700" /> {g}
                    </li>
                  ))}
                </ul>
                <form action={formAction} className="mt-5 space-y-3">
                  <input type="hidden" name="topic" value={topic} />
                  <input type="hidden" name="format" value="in_person" />
                  {activeSlug ? (
                    <input type="hidden" name="pharmacySlug" value={activeSlug} />
                  ) : (
                    <label className="block text-sm">
                      <span className="font-medium text-[#0c1a14]">Select pharmacy</span>
                      <select
                        name="pharmacySlug"
                        required
                        defaultValue=""
                        className="mt-1 w-full rounded-xl border border-teal-900/10 bg-[#f7faf8] px-3 py-2.5 text-sm"
                      >
                        <option value="" disabled>
                          Choose your local pharmacy
                        </option>
                        {pharmacies.map((p) => (
                          <option key={p.slug} value={p.slug}>
                            {p.name} {p.city ? `(${p.city})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block text-sm">
                    <span className="font-medium">Your name</span>
                    <input name="patientName" required defaultValue={defaultName} className="mt-1 w-full rounded-xl border border-teal-900/10 bg-[#f7faf8] px-3 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Phone</span>
                    <input name="patientPhone" required defaultValue={defaultPhone} className="mt-1 w-full rounded-xl border border-teal-900/10 bg-[#f7faf8] px-3 py-2.5 text-sm" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-sm">
                      <span className="font-medium">Preferred date</span>
                      <input type="date" name="preferredDate" className="mt-1 w-full rounded-xl border border-teal-900/10 bg-[#f7faf8] px-3 py-2.5 text-sm" />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium">Time</span>
                      <input name="preferredTime" placeholder="10:00" className="mt-1 w-full rounded-xl border border-teal-900/10 bg-[#f7faf8] px-3 py-2.5 text-sm" />
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="font-medium">What would you like to cover?</span>
                    <textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border border-teal-900/10 bg-[#f7faf8] px-3 py-2.5 text-sm" />
                  </label>
                  <button type="submit" disabled={pending} className="btn-primary inline-flex w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-100 disabled:saturate-50">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    {pending ? "Sending…" : "Request counselling"}
                  </button>
                  <p className="text-[11px] leading-relaxed text-[#5a6b62]">
                    Counselling is education and support, not a diagnosis or a prescription. Scope follows local pharmacy rules.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="liquid-glass care-glass rounded-3xl border border-[var(--health-ui-border)] bg-[var(--care-glass)] px-6 py-12 text-center text-sm text-[var(--muted)] backdrop-blur-xl">
              No active public-health campaigns. Seasonal flu and outbreak drives will appear here.
            </div>
          ) : (
            campaigns.map((c) => (
              <article key={c.slug} className="liquid-glass care-glass rounded-3xl border border-[var(--health-ui-border)] bg-[var(--care-glass)] p-6 shadow-sm backdrop-blur-xl transition hover:border-[var(--brand)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">{c.theme} · {c.targetPopulation}</p>
                <h3 className="mt-1 text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>{c.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{c.short}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {new Date(c.startDate).toLocaleDateString()}
                  {c.endDate ? ` – ${new Date(c.endDate).toLocaleDateString()}` : ""}
                  {c.walkInDays ? ` · ${c.walkInDays}` : ""}
                </p>
                <Link href="/vaccinations" className="mt-4 inline-flex text-sm font-semibold text-[var(--brand)]">
                  See vaccines in this campaign →
                </Link>
              </article>
            ))
          )}
        </div>
      )}

      {tab === "education" && (
        <div className="grid gap-5 md:grid-cols-2">
          {PUBLIC_HEALTH_EDUCATION.map((a) => (
            <article key={a.slug} id={a.slug} className="liquid-glass care-glass rounded-3xl border border-[var(--health-ui-border)] bg-[var(--care-glass)] p-6 shadow-sm backdrop-blur-xl transition hover:border-[var(--brand)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                {a.category} · {a.readTime}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
                {a.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{a.excerpt}</p>
              <ul className="mt-4 space-y-2">
                {a.points.map((p) => (
                  <li key={p} className="flex gap-2 text-sm text-[var(--muted)]">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
