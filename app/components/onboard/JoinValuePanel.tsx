"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Film,
  Maximize2,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import StorefrontPreview from "./StorefrontPreview";
import { Pharmacy3DStage } from "./cinema/Pharmacy3DStage";
import { CinematicModal3D } from "./cinema/CinematicModal3D";
import { cinematicAudio } from "./cinema/CinematicAudio";
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
  const [previewMode, setPreviewMode] = useState<"3d" | "phone">("3d");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(true);
  const [cinemaModalOpen, setCinemaModalOpen] = useState(false);

  // Synchronize live with typed input from OnboardWizard / AccountStep
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
        <p className={styles.kicker}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Pharmacy Membership Odyssey
        </p>
        <span className="text-[11px] font-bold text-[var(--brand)]">
          KES 100 once · launch free
        </span>
      </div>

      <h1 className={styles.display}>
        A chemist regulars <br />
        <em>come back to.</em>
      </h1>
      <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed max-w-xl">
        Your verified storefront, refill requests and pharmacy workspace. KES 100 once for regulatory verification; launch on Free or choose Premium for KES 500/month.
      </p>

      {/* Preview Mode Switcher (3D vs Phone) */}
      <div className="mt-3 flex items-center justify-between gap-2 p-1 rounded-xl bg-slate-950/60 border border-emerald-500/20 backdrop-blur-md">
        <div className="flex items-center gap-1" role="tablist" aria-label="Preview View Modes">
          <button
            type="button"
            role="tab"
            aria-selected={previewMode === "3d"}
            onClick={() => {
              cinematicAudio.playClick();
              setPreviewMode("3d");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              previewMode === "3d"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Film size={12} />
            <span>3D Cinema Stage</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={previewMode === "phone"}
            onClick={() => {
              cinematicAudio.playClick();
              setPreviewMode("phone");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              previewMode === "phone"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone size={12} />
            <span>Phone Preview</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            cinematicAudio.playClick();
            setCinemaModalOpen(true);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-1"
          title="Open Full 3D Cinema"
        >
          <Maximize2 size={12} />
          <span className="hidden sm:inline">Expand 3D</span>
        </button>
      </div>

      {/* Mobile / Tablet Interactive Preview Toggle (< 1024px) */}
      <div className="mt-2 block lg:hidden">
        <button
          type="button"
          onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--line-2)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand)] transition-all hover:bg-[var(--brand-soft)]"
        >
          <span className="flex items-center gap-1.5">
            <Film size={13} className="text-[var(--brand)]" />
            <span>{mobilePreviewOpen ? "Hide live preview" : "🎬 View 3D Cinema Preview (Tap to open)"}</span>
          </span>
          {mobilePreviewOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {mobilePreviewOpen && (
          <div className="mt-2 rounded-xl border border-[var(--line-2)] bg-[var(--card)] p-2 animate-fadeIn">
            {previewMode === "3d" ? (
              <Pharmacy3DStage
                initialName={pharmacyName}
                initialCity={city}
                initialSlug={slug}
                activeStage="ACCOUNT"
                compact={true}
                onExpandCinema={() => setCinemaModalOpen(true)}
              />
            ) : (
              <StorefrontPreview
                name={pharmacyName}
                city={city}
                slug={slug}
                flush
                mode="reactive-card"
                defaultAutoPlay={false}
                showControls={false}
              />
            )}
            <p className={`${styles.fieldHint} mt-1 text-center text-[10px]`}>
              Live preview updates as you type your pharmacy details below.
            </p>
          </div>
        )}
      </div>

      {/* Desktop Sticky Preview (>= 1024px) */}
      <div className="hidden lg:block mt-3">
        {previewMode === "3d" ? (
          <div>
            <Pharmacy3DStage
              initialName={pharmacyName}
              initialCity={city}
              initialSlug={slug}
              activeStage="ACCOUNT"
              compact={false}
              onExpandCinema={() => setCinemaModalOpen(true)}
            />
            <p className={`${styles.fieldHint} text-center mt-1.5 text-[11px] text-emerald-400/80`}>
              ✦ Live 3D projection updates in real-time as you type
            </p>
          </div>
        ) : (
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
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          <span className={styles.trust} style={{ marginTop: 0 }}>
            <ShieldCheck size={13} aria-hidden="true" /> Private until published
          </span>
          <span className="hidden sm:inline">·</span>
          <span><strong>KES 100</strong> one-time check</span>
          <span className="hidden sm:inline">·</span>
          <span><strong>Free</strong> for 5 medicines and 2 services</span>
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
          <Sparkles size={12} aria-hidden="true" />
          <span>Optional Premium: KES 500/month. Your free plan remains available after launch.</span>
        </p>
      </div>

      {/* Full-Screen 3D Cinema Immersion Modal */}
      <CinematicModal3D
        isOpen={cinemaModalOpen}
        onClose={() => setCinemaModalOpen(false)}
        pharmacyName={pharmacyName}
        city={city}
        slug={slug}
        activeStage="ACCOUNT"
      />
    </aside>
  );
}
