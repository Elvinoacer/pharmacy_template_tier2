import { PremiumGate } from "./PremiumGate";
import { Sparkles } from "lucide-react";

export function PremiumFeatureNotice({
  title,
  description,
  benefits = [],
  compact = false,
}: {
  title: string;
  description: string;
  benefits?: string[];
  compact?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-accent-soft)] ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-accent)]/20 bg-[var(--admin-card)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] admin-accent-text">
            <Sparkles className="h-3.5 w-3.5" />
            Premium growth feature
          </div>
          <h3 className="mt-3 text-base font-bold admin-text sm:text-lg">{title}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 admin-muted">{description}</p>
          {benefits.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {benefits.map((benefit) => (
                <span
                  key={benefit}
                  className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1 text-xs font-medium admin-muted"
                >
                  {benefit}
                </span>
              ))}
            </div>
          )}
        </div>
        <PremiumGate feature={title} description={description} />
      </div>
    </section>
  );
}
