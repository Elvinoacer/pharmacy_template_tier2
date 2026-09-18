"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import StorefrontPreview from "./StorefrontPreview";
import styles from "./OnboardSurface.module.css";

export default function JoinValuePanel({
  initialName = "Your pharmacy",
  initialCity = "Nearby",
}: {
  initialName?: string;
  initialCity?: string;
}) {
  const [pharmacyName, setPharmacyName] = useState(initialName);
  const [city, setCity] = useState(initialCity);
  const [slug, setSlug] = useState("");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // Synchronize live with typed input from OnboardWizard
  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<{ name?: string; city?: string; slug?: string }>;
      if (custom.detail?.name !== undefined) {
        setPharmacyName(custom.detail.name || "Your pharmacy");
      }
      if (custom.detail?.city !== undefined) {
        setCity(custom.detail.city || "Nearby");
      }
      if (custom.detail?.slug !== undefined) {
        setSlug(custom.detail.slug || "");
      }
    };

    window.addEventListener("afyvia-onboard-sync", handleSync);
    return () => window.removeEventListener("afyvia-onboard-sync", handleSync);
  }, []);

  return (
    <aside className={styles.value} aria-label="Why join Afyvia">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className={styles.kicker}>Pharmacy Membership</p>
        <span className="text-[11px] font-bold text-[var(--brand)] lg:hidden">
          KES 100 once · KES 500/mo
        </span>
      </div>
      <h1 className={styles.display}>
        A chemist regulars <br />
        <em>come back to.</em>
      </h1>
      <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed max-w-xl">
        Automated WhatsApp refill reminders, direct M-PESA payments, and your own verified online storefront. KES 0 until you launch.
      </p>

      {/* Mobile / Tablet Interactive Preview Toggle (< 1024px) */}
      <div className="mt-2 block lg:hidden">
        <button
          type="button"
          onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--line-2)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand)] transition-all hover:bg-[var(--brand-soft)]"
        >
          <span className="flex items-center gap-1.5">
            <Smartphone size={13} className="text-[var(--brand)]" />
            <span>{mobilePreviewOpen ? "Hide storefront preview" : "📱 Preview storefront (Tap to view)"}</span>
          </span>
          {mobilePreviewOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {mobilePreviewOpen && (
          <div className="mt-2 rounded-xl border border-[var(--line-2)] bg-[var(--card)] p-2 animate-fadeIn">
            <StorefrontPreview
              name={pharmacyName}
              city={city}
              slug={slug}
              flush
              mode="reactive-card"
              defaultAutoPlay={false}
              showControls={false}
            />
            <p className={`${styles.fieldHint} mt-1 text-center text-[10px]`}>
              Live preview updates as you type your pharmacy details below.
            </p>
          </div>
        )}
      </div>

      {/* Desktop Sticky Preview (>= 1024px) */}
      <div className="hidden lg:block mt-3">
        <div className={styles.joinPreview}>
          <StorefrontPreview
            name={pharmacyName}
            city={city}
            slug={slug}
            mode="reactive-card"
            defaultAutoPlay={false}
            showControls={false}
          />
          <p className={`${styles.fieldHint} text-center mt-1 text-[11px]`}>
            Live preview updates as you type
          </p>
        </div>
      </div>

      <div className="mt-2 lg:mt-3 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span className={styles.trust} style={{ marginTop: 0 }}>
            <ShieldCheck size={13} aria-hidden /> Private until published
          </span>
          <span className="hidden sm:inline">·</span>
          <span><strong>KES 100</strong> one-time check</span>
          <span className="hidden sm:inline">·</span>
          <span><strong>KES 500/mo</strong> only after launch</span>
        </div>

        <p
          className="hidden lg:flex"
          style={{
            marginTop: "0.35rem",
            fontSize: "0.72rem",
            color: "var(--brand)",
            alignItems: "center",
            gap: "0.35rem",
            fontWeight: 650,
          }}
        >
          <Sparkles size={12} aria-hidden />
          <span>1 retained chronic refill (avg KES 2,500) pays for 5 months of service</span>
        </p>
      </div>
    </aside>
  );
}
