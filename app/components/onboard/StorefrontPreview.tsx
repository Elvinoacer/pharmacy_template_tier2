"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  MessageCircle,
  Package,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Wifi,
  X,
} from "lucide-react";
import styles from "./StorefrontPreview.module.css";

const tiles = [
  { id: "catalogue", icon: Package, label: "Catalogue", badge: "1.4k" },
  { id: "refills", icon: Clock3, label: "Refills", badge: "3 due" },
  { id: "services", icon: Stethoscope, label: "Services", badge: "Live" },
  { id: "messages", icon: MessageCircle, label: "Messages", badge: "1 new" },
] as const;

type SubView = "home" | "catalogue" | "refills" | "services" | "messages" | "search";

type ToastState = {
  title: string;
  copy: string;
  icon: typeof Package;
} | null;

type DrawerState = {
  type: "refill" | "followup" | "verified";
  title: string;
  subtitle: string;
  details: string;
  ctaText: string;
  ctaSuccessText: string;
} | null;

type CursorPosition = {
  x: number;
  y: number;
  visible: boolean;
} | null;

const SIMULATION_CHAPTERS = [
  {
    id: 0,
    label: "1. Discover",
    timecode: "00:04",
    view: "home" as SubView,
    toast: {
      title: "Patient found your shop",
      copy: "Sarah N. (500m away) spotted your verified chemist open.",
      icon: Store,
    },
    cursor: { x: 50, y: 18, visible: true },
  },
  {
    id: 1,
    label: "2. Medicines",
    timecode: "00:11",
    view: "catalogue" as SubView,
    toast: {
      title: "1,400+ Kenyan medicines",
      copy: "Standard doses ready to sell. Stock updates show online instantly.",
      icon: Package,
    },
    cursor: { x: 78, y: 46, visible: true },
  },
  {
    id: 2,
    label: "3. Refill Rx",
    timecode: "00:19",
    view: "home" as SubView,
    toast: {
      title: "Refill request arrived",
      copy: "Amlodipine 5mg (30 tabs) · Ready for 1-tap M-PESA prompt.",
      icon: Package,
    },
    cursor: { x: 50, y: 72, visible: true },
  },
  {
    id: 3,
    label: "4. M-PESA STK",
    timecode: "00:27",
    view: "home" as SubView,
    toast: {
      title: "M-PESA payment confirmed",
      copy: "KES 950 paid instantly. Ready for counter pickup or boda delivery.",
      icon: Smartphone,
    },
    cursor: { x: 50, y: 88, visible: true },
  },
];

export default function StorefrontPreview({
  name = "Your pharmacy",
  city = "Nearby",
  slug = "your-pharmacy",
  flush = false,
  mode = "reactive-card",
  showControls,
  defaultAutoPlay,
}: {
  name?: string;
  city?: string;
  slug?: string;
  flush?: boolean;
  mode?: "video-demo" | "reactive-card";
  showControls?: boolean;
  defaultAutoPlay?: boolean;
}) {
  const isVideoMode = mode === "video-demo";
  const shouldShowControls = showControls !== undefined ? showControls : isVideoMode;
  const initialAutoPlay = defaultAutoPlay !== undefined ? defaultAutoPlay : isVideoMode;

  const [, startTransition] = useTransition();
  const [view, setView] = useState<SubView>("home");
  const [isPlaying, setIsPlaying] = useState(initialAutoPlay);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [drawerSuccess, setDrawerSuccess] = useState(false);
  const [stkPromptOpen, setStkPromptOpen] = useState(false);
  const [stkConfirmed, setStkConfirmed] = useState(false);
  const [cursorPos, setCursorPos] = useState<CursorPosition>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("All");
  const [stockCounts, setStockCounts] = useState<Record<string, number>>({
    amox: 28,
    metformin: 14,
    salbutamol: 3,
    augmentin: 9,
    coartem: 18,
  });
  const [liveClock, setLiveClock] = useState("21:45");

  // Keep a live clock on the phone status bar
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      setLiveClock(`${h}:${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Video Demo Choreography loop (only when isPlaying is active)
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setChapterIndex((prev) => {
        const next = (prev + 1) % SIMULATION_CHAPTERS.length;
        const chapter = SIMULATION_CHAPTERS[next];

        // Step transition
        setView(chapter.view);
        setToast(chapter.toast);
        setCursorPos(chapter.cursor);

        // Choreograph special steps in the video demo
        if (next === 2) {
          // Trigger the refill drawer simulation
          setStkPromptOpen(false);
          setDrawer({
            type: "refill",
            title: "Incoming Refill Request #482",
            subtitle: "Arrived just now · 500m away (Kilimani)",
            details: "Amlodipine 5mg (30 tabs) · Repeat prescription for Sarah N. Tap to prompt M-PESA STK.",
            ctaText: "Accept & Prompt KES 950 M-PESA STK",
            ctaSuccessText: "M-PESA STK Prompt Sent!",
          });
        } else if (next === 3) {
          // Trigger Safaricom STK prompt simulation
          setDrawer(null);
          setStkPromptOpen(true);
        } else {
          setStkPromptOpen(false);
          setDrawer(null);
        }

        return next;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4200);
    return () => clearInterval(timer);
  }, [toast]);

  const pauseVideoDemo = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setCursorPos(null);
    }
  };

  const handleTileClick = (targetView: SubView) => {
    pauseVideoDemo();
    startTransition(() => {
      setView(targetView);
    });
  };

  const handleSearchClick = () => {
    pauseVideoDemo();
    startTransition(() => {
      setView("search");
    });
  };

  const handleChapterSelect = (index: number) => {
    pauseVideoDemo();
    setChapterIndex(index);
    const chapter = SIMULATION_CHAPTERS[index];
    setView(chapter.view);
    setToast(chapter.toast);
    setStkPromptOpen(false);
    setDrawer(null);
  };

  const handleOpenRefillDrawer = () => {
    pauseVideoDemo();
    setDrawerSuccess(false);
    setDrawer({
      type: "refill",
      title: "Refill Request #482",
      subtitle: "Sarah N. · 500m away",
      details: "Amlodipine 5mg (30 tabs). Regular repeat patient. Tap below to send an M-PESA prompt directly to her phone.",
      ctaText: "Prompt KES 950 M-PESA",
      ctaSuccessText: "M-PESA prompt sent to 0722***819",
    });
  };

  const handleOpenFollowupDrawer = () => {
    pauseVideoDemo();
    setDrawerSuccess(false);
    setDrawer({
      type: "followup",
      title: "Automated Refill Check-in",
      subtitle: "Keeps regular patients coming back",
      details: "David O. has 2 days of blood pressure pills left. An automated WhatsApp check-in reminds him before he runs out.",
      ctaText: "Send WhatsApp Reminder",
      ctaSuccessText: "WhatsApp reminder sent!",
    });
  };

  const handleOpenVerifiedDrawer = () => {
    pauseVideoDemo();
    setDrawerSuccess(false);
    setDrawer({
      type: "verified",
      title: "PPB Verified Pharmacy",
      subtitle: "Licensed Premises & Pharmacist",
      details: `Registered with Pharmacy and Poisons Board Kenya. Protected against copycats. Verified location: ${city}.`,
      ctaText: "Close",
      ctaSuccessText: "Verified Trust Seal Active",
    });
  };

  const handlePromptStk = () => {
    setDrawer(null);
    setStkConfirmed(false);
    setStkPromptOpen(true);
  };

  const handleConfirmStkPin = () => {
    setStkConfirmed(true);
    setTimeout(() => {
      setStkPromptOpen(false);
      setStkConfirmed(false);
      setToast({
        title: "✓ M-PESA STK Confirmed (KES 950)",
        copy: "Receipt: SJ8291KL02 · Order marked paid. Ready for counter pickup or boda dispatch.",
        icon: Smartphone,
      });
    }, 1200);
  };

  const handleRestock = (key: string) => {
    pauseVideoDemo();
    setStockCounts((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 10,
    }));
    setToast({
      title: "+10 Stock Added (Live Sync)",
      copy: "Inventory updated. Patients searching medicines nearby see new stock within 50ms.",
      icon: Package,
    });
  };

  return (
    <div className={flush ? `${styles.container} ${styles.containerFlush}` : styles.container}>
      <div className={styles.ambientGlow} aria-hidden />

      {/* Interactive Tour Scrubber Bar */}
      {shouldShowControls && (
        <div className={styles.chapterBar} role="region" aria-label="Interactive tour chapters">
          <div className={styles.chapterBarControls}>
            <button
              type="button"
              className={`${styles.playBtn} ${isPlaying ? styles.playBtnActive : ""}`}
              onClick={() => {
                const nextState = !isPlaying;
                setIsPlaying(nextState);
                if (!nextState) setCursorPos(null);
              }}
              title={isPlaying ? "Pause auto-tour" : "Play auto-tour"}
              aria-label={isPlaying ? "Pause auto-tour" : "Play auto-tour"}
            >
              {isPlaying ? <Pause size={11} aria-hidden /> : <Play size={11} aria-hidden />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => {
                pauseVideoDemo();
                setView("home");
                setChapterIndex(0);
                setToast(null);
                setDrawer(null);
                setStkPromptOpen(false);
              }}
              title="Reset view"
              aria-label="Reset storefront view"
            >
              <RotateCcw size={10} aria-hidden />
            </button>
          </div>

          <div className={styles.chapterChips} role="tablist" aria-label="Tour chapters">
            {SIMULATION_CHAPTERS.map((chapter, idx) => (
              <button
                key={chapter.id}
                type="button"
                role="tab"
                aria-selected={chapterIndex === idx}
                className={`${styles.chapterChip} ${chapterIndex === idx ? styles.chapterChipActive : ""}`}
                onClick={() => handleChapterSelect(idx)}
              >
                <span
                  className={styles.chapterPip}
                  style={{ background: chapterIndex >= idx ? "var(--brand)" : "var(--line-2)" }}
                  aria-hidden
                />
                <span>{chapter.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================================================
          PHONE HARDWARE BEZEL (Simulated Mobile Screen)
          ========================================================================== */}
      <div className={styles.bezel}>
        {/* Subtle glass specular reflection */}
        <div className={styles.glassReflection} aria-hidden />

        <div className={styles.screen}>
          {/* Status Bar */}
          <div className={styles.statusBar} aria-hidden>
            <span>{liveClock}</span>
            <div className={styles.dynamicIsland} />
            <span className="flex items-center gap-1.5">
              <span>5G</span>
              <Wifi size={11} />
            </span>
          </div>

          {/* Browser URL Pill */}
          <div className={styles.chrome}>
            <div className={styles.chromeDots} aria-hidden>
              <i />
              <i />
              <i />
            </div>
            <div className={styles.urlPill}>
              <ShieldCheck size={11} aria-hidden />
              <em>afyvia.health/p/{slug || "your-pharmacy"}</em>
            </div>
          </div>

          {/* Screen Content Body */}
          <div className={styles.screenBody}>
            {/* Live Video Demo Animated Touch Indicator */}
            {isPlaying && cursorPos && cursorPos.visible && (
              <div
                className={styles.simulatedTouchCursor}
                style={{
                  top: `${cursorPos.y}%`,
                  left: `${cursorPos.x}%`,
                }}
                aria-hidden
              >
                <span className={styles.touchRippleRing} />
              </div>
            )}

            {/* Inbound Toast Notification */}
            {toast && (
              <aside className={styles.toastNotice} role="status">
                <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)] shrink-0">
                  <toast.icon size={13} aria-hidden />
                </span>
                <div>
                  <strong>{toast.title}</strong>
                  <p>{toast.copy}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="ml-auto text-white/60 hover:text-white"
                  aria-label="Dismiss notification"
                >
                  <X size={13} />
                </button>
              </aside>
            )}

            {/* ====================================================================
                VIEW 1: HOME (THE CORE STOREFRONT CARD SPECIFIED IN USER TASK)
                ==================================================================== */}
            {view === "home" && (
              <>
                {/* Store Header Banner */}
                <div className={styles.storeHead}>
                  <span className={styles.storeIconBox} aria-hidden>
                    <Store className="h-4 w-4" />
                  </span>
                  <div className={styles.storeHeadInfo}>
                    <strong className={styles.storeHeadTitle}>{name}</strong>
                    <button
                      type="button"
                      className={styles.storeHeadBadge}
                      onClick={handleOpenVerifiedDrawer}
                      title="Click to view regulatory credentials"
                    >
                      <BadgeCheck className="h-3 w-3 text-emerald-300" aria-hidden />
                      Verified · Open today
                    </button>
                  </div>
                  <b className={styles.storeHeadDistance}>{city}</b>
                </div>

                {/* Search Bar */}
                <button
                  type="button"
                  className={styles.searchBar}
                  onClick={handleSearchClick}
                  aria-label="Search medicines and services"
                >
                  <Search className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
                  <span>Search medicines and services</span>
                </button>

                {/* 4 Interactive Action Tiles */}
                <div className={styles.tiles} role="navigation" aria-label="Storefront sections">
                  {tiles.map(({ id, icon: Icon, label, badge }) => (
                    <button
                      key={id}
                      type="button"
                      className={styles.tileBtn}
                      onClick={() => handleTileClick(id as SubView)}
                    >
                      <span className={styles.tileIconWrap} aria-hidden>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span>{label}</span>
                      <span className={styles.tileBadge}>{badge}</span>
                    </button>
                  ))}
                </div>

                {/* Sample Activity Card */}
                <div className={styles.activityCard}>
                  <div className={styles.activityHead}>
                    <p className={styles.activityTitle}>
                      <span className={styles.livePulseDot} />
                      Sample activity
                    </p>
                    <span className={styles.activityInteractiveHint}>
                      <Eye size={11} aria-hidden /> Tap to review
                    </span>
                  </div>

                  <div className={styles.activityList}>
                    {/* Item 1: New Refill Request */}
                    <button
                      type="button"
                      className={styles.activityItem}
                      onClick={handleOpenRefillDrawer}
                    >
                      <span className={styles.activityIconWrap} aria-hidden>
                        <Package className="h-3.5 w-3.5" />
                      </span>
                      <div className={styles.activityItemContent}>
                        <div className={styles.activityPrimaryRow}>
                          <strong>Refill request</strong>
                          <span className={styles.activityBadge}>Just now</span>
                        </div>
                        <small>Amlodipine 5mg · Repeat Rx #482</small>
                      </div>
                      <ChevronRight className={styles.activityItemChevron} size={14} aria-hidden />
                    </button>

                    {/* Item 2: Patient Follow-up */}
                    <button
                      type="button"
                      className={styles.activityItem}
                      onClick={handleOpenFollowupDrawer}
                    >
                      <span className={styles.activityIconWrap} aria-hidden>
                        <MessageCircle className="h-3.5 w-3.5" />
                      </span>
                      <div className={styles.activityItemContent}>
                        <div className={styles.activityPrimaryRow}>
                          <strong>Auto refill reminder</strong>
                          <span className={styles.activityBadge}>WhatsApp ready</span>
                        </div>
                        <small>BP refill check-in · Day 28</small>
                      </div>
                      <ChevronRight className={styles.activityItemChevron} size={14} aria-hidden />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ====================================================================
                VIEW 2: CATALOGUE
                ==================================================================== */}
            {view === "catalogue" && (
              <div className={styles.subScreen}>
                <div className={styles.subScreenHeader}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setView("home")}
                  >
                    <ArrowLeft size={12} aria-hidden /> Back
                  </button>
                  <span className={styles.subScreenTitle}>Pre-Loaded Catalogue (1,400+)</span>
                </div>

                <p className="text-[11px] text-[var(--muted)] leading-tight">
                  Strengths, dosages, and prices ready to sell. Tap restock to simulate live sync:
                </p>

                <div className={styles.cardList}>
                  {[
                    { key: "amox", name: "Amoxicillin 500mg (30s)", price: "KES 450", low: false },
                    { key: "metformin", name: "Metformin 500mg (100s)", price: "KES 350", low: false },
                    { key: "salbutamol", name: "Salbutamol 100mcg Inhaler", price: "KES 750", low: true },
                    { key: "augmentin", name: "Augmentin 625mg (14s)", price: "KES 1,400", low: false },
                    { key: "coartem", name: "Coartem 20/120mg (24s)", price: "KES 600", low: false },
                  ].map((med) => (
                    <div key={med.key} className={styles.miniCard}>
                      <div>
                        <strong className={styles.miniCardTitle}>{med.name}</strong>
                        <p className={styles.miniCardMeta}>
                          {med.price} ·{" "}
                          <span
                            className={
                              med.low ? "font-bold text-amber-600" : "text-emerald-700 font-semibold"
                            }
                          >
                            {stockCounts[med.key] || 0} in stock
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.miniCardAction}
                        onClick={() => handleRestock(med.key)}
                      >
                        + Restock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ====================================================================
                VIEW 3: REFILLS
                ==================================================================== */}
            {view === "refills" && (
              <div className={styles.subScreen}>
                <div className={styles.subScreenHeader}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setView("home")}
                  >
                    <ArrowLeft size={12} aria-hidden /> Back
                  </button>
                  <span className={styles.subScreenTitle}>Chronic Refill Engine</span>
                </div>

                <p className="text-[11px] text-[var(--muted)] leading-tight">
                  Automated WhatsApp reminders retain your hypertension & diabetes patients:
                </p>

                <div className={styles.cardList}>
                  <div className={styles.miniCard}>
                    <div>
                      <strong className={styles.miniCardTitle}>Grace W. · Amlodipine 5mg</strong>
                      <p className={styles.miniCardMeta}>Cycle: Day 28 of 30 · KES 950</p>
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand)]">
                        <CheckCircle2 size={11} /> WhatsApp reminder dispatched
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.miniCardAction}
                      onClick={handleOpenRefillDrawer}
                    >
                      Process STK
                    </button>
                  </div>

                  <div className={styles.miniCard}>
                    <div>
                      <strong className={styles.miniCardTitle}>Peter K. · Glucophage 1g</strong>
                      <p className={styles.miniCardMeta}>Diabetes repeat · KES 1,850</p>
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <Check size={11} /> M-PESA payment confirmed
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.miniCardAction}
                      onClick={() =>
                        setToast({
                          title: "Marked ready for pickup",
                          copy: "Patient notified via SMS & WhatsApp that package is ready.",
                          icon: Package,
                        })
                      }
                    >
                      Ready ✓
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ====================================================================
                VIEW 4: SERVICES
                ==================================================================== */}
            {view === "services" && (
              <div className={styles.subScreen}>
                <div className={styles.subScreenHeader}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setView("home")}
                  >
                    <ArrowLeft size={12} aria-hidden /> Back
                  </button>
                  <span className={styles.subScreenTitle}>In-Pharmacy Clinical Services</span>
                </div>

                <p className="text-[11px] text-[var(--muted)] leading-tight">
                  Publish bookable health screenings and consultations to your community:
                </p>

                <div className={styles.cardList}>
                  {[
                    { title: "BP & Blood Glucose Screening", fee: "KES 200 · Walk-in" },
                    { title: "Vaccination Administration (Flu/Hep)", fee: "KES 1,200 · Appointment" },
                    { title: "Medication Therapy Review (15m)", fee: "Free with Refill" },
                  ].map((s) => (
                    <div key={s.title} className={styles.miniCard}>
                      <div>
                        <strong className={styles.miniCardTitle}>{s.title}</strong>
                        <p className={styles.miniCardMeta}>{s.fee}</p>
                      </div>
                      <button
                        type="button"
                        className={styles.miniCardAction}
                        onClick={() =>
                          setToast({
                            title: "Booking slot confirmed",
                            copy: "Patient appointment reserved on your staff desk.",
                            icon: Stethoscope,
                          })
                        }
                      >
                        Book
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ====================================================================
                VIEW 5: MESSAGES (AI Intake)
                ==================================================================== */}
            {view === "messages" && (
              <div className={styles.subScreen}>
                <div className={styles.subScreenHeader}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setView("home")}
                  >
                    <ArrowLeft size={12} aria-hidden /> Back
                  </button>
                  <span className={styles.subScreenTitle}>24/7 WhatsApp & Chat Intake</span>
                </div>

                <div className={styles.chatList}>
                  <div className={`${styles.chatBubble} ${styles.chatPatient}`}>
                    Hi, do you have Ventolin inhaler tonight? I am in Kilimani.
                  </div>
                  <div className={`${styles.chatBubble} ${styles.chatPharmacy}`}>
                    Yes! 3 units available at KES 750. We are open for pickup or dispatch via rider.
                  </div>
                  <div className={`${styles.chatBubble} ${styles.chatPatient}`}>
                    Please dispatch via boda! My phone is 0712***456.
                  </div>
                  <div className={`${styles.chatBubble} ${styles.chatPharmacy}`}>
                    ⚡ STK Push of KES 950 sent to your M-PESA. Order #482 confirmed!
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.miniCardAction}
                  style={{ width: "100%", padding: "0.5rem", textAlign: "center" }}
                  onClick={() =>
                    setToast({
                      title: "Live Chat Active",
                      copy: "Afyvia AI handles late-night medicine availability while you rest.",
                      icon: Sparkles,
                    })
                  }
                >
                  Simulate New Patient Enquiry
                </button>
              </div>
            )}

            {/* ====================================================================
                VIEW 6: SEARCH
                ==================================================================== */}
            {view === "search" && (
              <div className={styles.subScreen}>
                <div className={styles.subScreenHeader}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => setView("home")}
                  >
                    <ArrowLeft size={12} aria-hidden /> Back
                  </button>
                  <span className={styles.subScreenTitle}>Live Medicine Search</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Try 'Panadol', 'Amox', 'Inhaler'..."
                    className="w-full rounded-lg border border-[var(--line-2)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)]"
                    autoFocus
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto py-1 text-[10px]">
                  {["All", "Antibiotics", "Chronic", "Pain"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSearchFilter(cat)}
                      className={`rounded-full px-2.5 py-0.5 font-bold transition-colors ${
                        searchFilter === cat
                          ? "bg-[var(--brand)] text-white"
                          : "bg-[var(--card)] text-[var(--muted)] border border-[var(--line-2)]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className={styles.cardList}>
                  {[
                    { name: "Amoxicillin 500mg Caps", price: "KES 450", tag: "Antibiotics" },
                    { name: "Panadol Extra (100s)", price: "KES 650", tag: "Pain" },
                    { name: "Amlodipine 5mg (30s)", price: "KES 950", tag: "Chronic" },
                  ]
                    .filter(
                      (item) =>
                        (searchFilter === "All" || item.tag === searchFilter) &&
                        item.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <div key={item.name} className={styles.miniCard}>
                        <div>
                          <strong className={styles.miniCardTitle}>{item.name}</strong>
                          <p className={styles.miniCardMeta}>{item.price} · In stock</p>
                        </div>
                        <button
                          type="button"
                          className={styles.miniCardAction}
                          onClick={() => {
                            setToast({
                              title: `Selected ${item.name}`,
                              copy: "Patient can reserve for pickup or order delivery immediately.",
                              icon: Package,
                            });
                          }}
                        >
                          Select
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* ====================================================================
              INTERACTIVE FLY-UP DRAWER (Refill review, Follow-up, Verified seal)
              ==================================================================== */}
          {drawer && (
            <div className={styles.drawerOverlay} onClick={() => setDrawer(null)}>
              <div
                className={styles.drawerSheet}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={drawer.title}
              >
                <div className={styles.drawerPill} />
                <h4 className={styles.drawerTitle}>{drawer.title}</h4>
                <p className="text-[11px] font-bold text-[var(--brand)]">{drawer.subtitle}</p>
                <p className={styles.drawerSub}>{drawer.details}</p>

                <div className={styles.drawerActions}>
                  <button
                    type="button"
                    className={styles.drawerBtnPrimary}
                    onClick={() => {
                      if (drawer.type === "refill") {
                        handlePromptStk();
                      } else {
                        setDrawerSuccess(true);
                        setTimeout(() => {
                          setDrawer(null);
                          setDrawerSuccess(false);
                        }, 1800);
                      }
                    }}
                  >
                    {drawerSuccess ? (
                      <>
                        <CheckCircle2 size={13} aria-hidden /> {drawer.ctaSuccessText}
                      </>
                    ) : (
                      drawer.ctaText
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.drawerBtnSecondary}
                    onClick={() => setDrawer(null)}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              AUTHENTIC SAFARICOM M-PESA STK PUSH PHONE SIMULATION MODAL
              ==================================================================== */}
          {stkPromptOpen && (
            <div className={styles.stkModalOverlay} onClick={() => setStkPromptOpen(false)}>
              <div
                className={styles.stkPromptCard}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Safaricom M-PESA STK Push prompt"
              >
                <div className={styles.stkHeader}>
                  <span className={styles.stkHeaderTitle}>Safaricom M-PESA</span>
                  <Smartphone size={14} aria-hidden />
                </div>
                <div className={styles.stkBody}>
                  <p className={styles.stkMessage}>
                    Do you want to pay to <strong>{name}</strong> for Refill #482?
                  </p>
                  <span className={styles.stkAmountHighlight}>KES 950.00</span>
                  <div className={styles.stkPinBox}>••••</div>
                  <p className="mt-1 text-[10px] text-gray-500 text-center">
                    Enter M-PESA PIN on your handset to confirm
                  </p>
                  <div className={styles.stkActions}>
                    <button
                      type="button"
                      className={styles.stkCancelBtn}
                      onClick={() => setStkPromptOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.stkConfirmBtn}
                      onClick={handleConfirmStkPin}
                    >
                      {stkConfirmed ? "Verifying..." : "Send (PIN)"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Home indicator bar */}
          <div className={styles.homeIndicator} aria-hidden />
        </div>
      </div>
    </div>
  );
}
