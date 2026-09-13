"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  FileUp,
  HeartPulse,
  Pill,
  RotateCw,
  Search,
} from "lucide-react";
import styles from "./CareIntentNavigator.module.css";

export type CareIntent =
  | "medicine"
  | "prescription"
  | "refill"
  | "service"
  | "pharmacy";

const INTENTS = [
  {
    id: "medicine" as const,
    label: "Find medicine",
    helper: "Search name or brand",
    icon: Pill,
  },
  {
    id: "prescription" as const,
    label: "Use a prescription",
    helper: "Upload or enter medicines",
    icon: FileUp,
  },
  {
    id: "refill" as const,
    label: "Refill medicine",
    helper: "Check availability first",
    icon: RotateCw,
  },
  {
    id: "service" as const,
    label: "Find a service",
    helper: "Screening, vaccine, consult",
    icon: HeartPulse,
  },
  {
    id: "pharmacy" as const,
    label: "Find a pharmacy",
    helper: "Only if you want a specific one",
    icon: Building2,
  },
];

export default function CareIntentNavigator({
  signedIn = false,
  initialIntent,
  initialQuery = "",
  compact = false,
  title = "What brings you today?",
  description =
    "Start with what you need. We’ll show availability and connect the pharmacy only when it matters.",
}: {
  signedIn?: boolean;
  initialIntent?: CareIntent;
  initialQuery?: string;
  compact?: boolean;
  title?: string;
  description?: string;
}) {
  const [intent, setIntent] = useState<CareIntent | null>(initialIntent ?? null);

  return (
    <section
      className={`${styles.navigator} ${compact ? styles.compact : ""}`}
      aria-labelledby="care-intent-title"
    >
      <div className={styles.heading}>
        <span className={styles.step}>1</span>
        <div>
          <p className={styles.eyebrow}>START WITH YOUR NEED</p>
          <h2 id="care-intent-title">{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className={styles.intents} role="list" aria-label="Choose what you need">
        {INTENTS.map((item) => {
          const Icon = item.icon;
          const active = intent === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={styles.intent}
              data-active={active ? "true" : "false"}
              aria-pressed={active}
              onClick={() => setIntent(item.id)}
            >
              <span className={styles.icon}>
                <Icon size={20} aria-hidden />
              </span>
              <span className={styles.intentCopy}>
                <strong>{item.label}</strong>
                <small>{item.helper}</small>
              </span>
              <ArrowRight className={styles.intentArrow} size={16} aria-hidden />
            </button>
          );
        })}
      </div>

      {intent && (
        <div className={styles.detail} aria-live="polite">
          <div className={styles.detailHeading}>
            <span className={styles.step}>2</span>
            <div>
              <p className={styles.eyebrow}>YOUR NEXT STEP</p>
              <h3>
                {intent === "medicine" && "Search the medicine first."}
                {intent === "prescription" && "Bring the prescription first."}
                {intent === "refill" && "Tell us what you need again."}
                {intent === "service" && "Find the care first."}
                {intent === "pharmacy" && "Browse pharmacies by choice."}
              </h3>
            </div>
          </div>

          {intent === "medicine" && (
            <div className={styles.actionBody}>
              <p>
                Compare matching listings, prices and availability across the network. The supplying pharmacy stays attached to the result.
              </p>
              <form action="/medicines" method="GET" className={styles.searchRow} role="search">
                <Search size={18} aria-hidden />
                <input
                  name="q"
                  type="search"
                  defaultValue={initialQuery}
                  placeholder="Medicine name, brand or generic"
                  aria-label="Medicine name"
                />
                <button type="submit">
                  Search <ArrowRight size={15} aria-hidden />
                </button>
              </form>
              <Link href="/prescription" className={styles.secondaryLink}>
                Have several medicines? Upload a prescription <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          )}

          {intent === "prescription" && (
            <div className={styles.actionBody}>
              <p>
                Upload a clear photo or enter the medicine names. We check availability first and connect a supplier afterward.
              </p>
              <div className={styles.actions}>
                <Link href="/prescription" className={styles.primaryLink}>
                  <FileUp size={17} aria-hidden /> Upload prescription
                  <ArrowRight size={15} aria-hidden />
                </Link>
                <Link href="/medicines" className={styles.secondaryButton}>
                  Search manually
                </Link>
              </div>
            </div>
          )}

          {intent === "refill" && (
            <div className={styles.actionBody}>
              <p>
                Start with the medicine you need again. We’ll check current listings before your request is sent anywhere.
              </p>
              <div className={styles.actions}>
                <Link href="/refill" className={styles.primaryLink}>
                  <RotateCw size={17} aria-hidden /> Find my refill
                  <ArrowRight size={15} aria-hidden />
                </Link>
                {signedIn && (
                  <Link href="/portal/prescriptions" className={styles.secondaryButton}>
                    Use a saved prescription
                  </Link>
                )}
              </div>
            </div>
          )}

          {intent === "service" && (
            <div className={styles.actionBody}>
              <p>
                Search screenings, vaccinations, consultations and other care across participating pharmacies before choosing where to book.
              </p>
              <form action="/services" method="GET" className={styles.searchRow} role="search">
                <Search size={18} aria-hidden />
                <input
                  name="q"
                  type="search"
                  defaultValue={initialQuery}
                  placeholder="Screening, vaccination, consultation…"
                  aria-label="Service name"
                />
                <button type="submit">
                  Find care <ArrowRight size={15} aria-hidden />
                </button>
              </form>
            </div>
          )}

          {intent === "pharmacy" && (
            <div className={styles.actionBody}>
              <p>
                If you already know you want a particular pharmacy, browse the directory. This is optional for medicine and service discovery.
              </p>
              <div className={styles.actions}>
                <Link href="/pharmacies" className={styles.primaryLink}>
                  <Building2 size={17} aria-hidden /> Browse pharmacies
                  <ArrowRight size={15} aria-hidden />
                </Link>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIntent(null)}
                >
                  Choose another need
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.accountBar}>
        {signedIn ? (
          <>
            <span>Your account stays useful without locking you to a pharmacy.</span>
            <nav aria-label="Saved care shortcuts">
              <Link href="/portal/prescriptions">My prescriptions</Link>
              <Link href="/portal/refills">My requests</Link>
            </nav>
          </>
        ) : (
          <span>
            You can explore medicines and services as a guest. Sign in is only requested when an action needs your account.
          </span>
        )}
      </div>
    </section>
  );
}
