"use client";

import { useState } from "react";
import { ArrowRight, Calculator, CheckCircle2, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

export default function PharmacyRoiCalculator() {
  const [patients, setPatients] = useState(40);
  const avgRefillValue = 2500; // KES average chronic refill in Kenya
  const monthlyAfyviaFee = 500; // KES 500/mo
  const monthlyTurnover = patients * avgRefillValue;
  // Conservative 30% retention preservation from stopping silent churn
  const preservedMonthlyRevenue = Math.round(patients * 0.3 * avgRefillValue);
  const preservedAnnualRevenue = preservedMonthlyRevenue * 12;
  const roiMultiplier = Math.round(preservedMonthlyRevenue / monthlyAfyviaFee);

  return (
    <section className="mt-6 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--brand-soft)] p-4 sm:p-6 shadow-sm" aria-label="Pharmacy ROI and Retention Calculator">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] pb-3 sm:pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
            <Calculator size={14} aria-hidden /> Retention & Revenue Calculator
          </span>
          <h3 className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-[var(--foreground)] tracking-tight">
            See the math for your pharmacy
          </h3>
          <p className="mt-0.5 text-xs sm:text-sm text-[var(--muted)]">
            How WhatsApp refill reminders keep chronic regulars coming back every month.
          </p>
        </div>
        <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-deep)]">
          KES 500 / month flat
        </span>
      </div>

      <div className="mt-4 sm:mt-5 grid gap-5 lg:grid-cols-12 lg:items-center">
        {/* Slider & Input Controls */}
        <div className="space-y-3.5 lg:col-span-6">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="chronic-patient-slider" className="text-xs sm:text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <Users size={15} className="text-[var(--brand)]" />
                <span>Monthly chronic patients you serve</span>
              </label>
              <strong className="text-base sm:text-lg font-bold text-[var(--brand)]">
                {patients} patients
              </strong>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              Hypertension, diabetes, asthma & cholesterol regulars in your area.
            </p>
            <input
              id="chronic-patient-slider"
              type="range"
              min={10}
              max={150}
              step={5}
              value={patients}
              onChange={(e) => setPatients(Number(e.target.value))}
              className="mt-2.5 w-full accent-[var(--brand)] cursor-pointer h-2 bg-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] rounded-lg"
            />
            <div className="mt-1.5 flex justify-between text-[11px] font-medium text-[var(--muted)]">
              <span>10 (Small chemist)</span>
              <span>40 (Neighborhood)</span>
              <span>100+ (Busy centre)</span>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--muted)] self-center">Quick pick:</span>
            {[15, 30, 50, 80, 120].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPatients(preset)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  patients === preset
                    ? "bg-[var(--brand)] text-[var(--background)]"
                    : "bg-[var(--card-elev)] text-[var(--foreground)] border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] hover:border-[var(--brand)]"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] bg-[var(--card)] p-2.5 sm:p-3 text-xs text-[var(--muted)] space-y-1">
            <div className="flex justify-between">
              <span>Avg chronic spend in Kenya:</span>
              <strong className="text-[var(--foreground)]">KES {avgRefillValue.toLocaleString()} / refill</strong>
            </div>
            <div className="flex justify-between">
              <span>Silent churn without automated reminders:</span>
              <strong className="text-rose-700 dark:text-rose-300">30% drop-off</strong>
            </div>
            <div className="flex justify-between">
              <span>Monthly chronic refill pool:</span>
              <strong className="text-[var(--foreground)]">KES {monthlyTurnover.toLocaleString()} / mo</strong>
            </div>
          </div>
        </div>

        {/* Calculated Impact Card */}
        <div className="rounded-xl border-2 border-[var(--brand)] bg-[var(--card)] p-4 sm:p-5 shadow-sm lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] flex items-center gap-1.5">
              <TrendingUp size={15} /> Projected Return
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
              {roiMultiplier}x ROI on KES 500
            </span>
          </div>

          <div>
            <span className="text-xs text-[var(--muted)]">Preserved revenue saved from churn:</span>
            <p className="mt-0.5 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
              KES {preservedMonthlyRevenue.toLocaleString()}
              <span className="text-sm font-sans font-normal text-[var(--muted)]"> / month</span>
            </p>
            <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              ~KES {preservedAnnualRevenue.toLocaleString()} in recurring patient loyalty per year
            </p>
          </div>

          <div className="space-y-1.5 border-t border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] pt-2.5 text-xs">
            <div className="flex items-start gap-2 text-[var(--muted)]">
              <CheckCircle2 size={14} className="text-[var(--brand)] shrink-0 mt-0.5" />
              <span>
                <strong>Free plan available:</strong> KES 100 verification fee once. Premium is optional at KES 500/month.
              </span>
            </div>
            <div className="flex items-start gap-2 text-[var(--muted)]">
              <CheckCircle2 size={14} className="text-[var(--brand)] shrink-0 mt-0.5" />
              <span>
                <strong>Just 1 saved refill (KES 2,500)</strong> equals 5 months of the optional Premium subscription in gross revenue.
              </span>
            </div>
          </div>

          <div className="pt-1">
            <Link href="/onboard" className="btn-primary w-full justify-center !py-2.5 text-sm">
              Start with your pharmacy <ArrowRight size={15} aria-hidden />
            </Link>
            <p className="mt-1.5 text-center text-[11px] text-[var(--muted)]">
              KES 100 once for PPB check · KES 500/mo only when you start taking live orders.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
