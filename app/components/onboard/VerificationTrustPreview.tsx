"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import styles from "./VerificationTrustPreview.module.css";

type Props = {
  pharmacyName?: string;
  city?: string;
  ppbPremisesNumber?: string | null;
  licenseNumber?: string | null;
};

export default function VerificationTrustPreview({
  pharmacyName = "Your Pharmacy",
  city = "Your Location",
  ppbPremisesNumber,
  licenseNumber,
}: Props) {
  const [activeTab, setActiveTab] = useState<"both" | "verified" | "unverified">("both");

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.titleGroup}>
          <span className={styles.iconShield}>
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h3 className={styles.titleText}>Why the KES 100 verification fee?</h3>
            <p className={styles.titleSub}>See how patients see your pharmacy before & after verification</p>
          </div>
        </div>

        <div className={styles.switchToggle} role="tablist" aria-label="Comparison view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "both"}
            className={`${styles.switchBtn} ${activeTab === "both" ? styles.switchBtnActive : ""}`}
            onClick={() => setActiveTab("both")}
          >
            Compare Both
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "verified"}
            className={`${styles.switchBtn} ${activeTab === "verified" ? styles.switchBtnActive : ""}`}
            onClick={() => setActiveTab("verified")}
          >
            With Verification
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "unverified"}
            className={`${styles.switchBtn} ${activeTab === "unverified" ? styles.switchBtnActive : ""}`}
            onClick={() => setActiveTab("unverified")}
          >
            Unverified
          </button>
        </div>
      </div>

      <div className={styles.cardComparison}>
        {/* Unverified Card */}
        {(activeTab === "both" || activeTab === "unverified") && (
          <div className={`${styles.previewCard} ${styles.previewCardUnverified}`}>
            <div>
              <div className={styles.badgeRow}>
                <span className={styles.statusPillUnverified}>
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                  Unverified Listing
                </span>
                <span className={`${styles.trustScore} ${styles.trustScoreRed}`}>Patient Trust: 🔴 Low</span>
              </div>

              <h4 className={styles.pharmacyName}>{pharmacyName}</h4>
              <p className={styles.pharmacyMeta}>
                📍 {city} · ⚠️ PPB Licence Unconfirmed
              </p>

              <div className={styles.patientWarning}>
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Patients hesitate to send prescriptions or money to unverified sellers. Impostors can copy your name.</span>
              </div>
            </div>

            <div className={styles.mockButtonRow}>
              <div className={styles.mockBtnDisabled}>WhatsApp (Hidden)</div>
              <div className={styles.mockBtnDisabled}>Refill Order (Disabled)</div>
            </div>
          </div>
        )}

        {/* Verified Card */}
        {(activeTab === "both" || activeTab === "verified") && (
          <div className={`${styles.previewCard} ${styles.previewCardVerified}`}>
            <div>
              <div className={styles.badgeRow}>
                <span className={styles.statusPillVerified}>
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  PPB Verified Chemist
                </span>
                <span className={`${styles.trustScore} ${styles.trustScoreGreen}`}>Patient Trust: 🟢 99%</span>
              </div>

              <h4 className={styles.pharmacyName}>{pharmacyName}</h4>
              <p className={styles.pharmacyMeta}>
                📍 {city} · ✓ PPB Reg #{ppbPremisesNumber || licenseNumber || "Verified"}
              </p>

              <div className={styles.patientBenefit}>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Official neighborhood chemist badge. Patients trust you with chronic refills & send M-PESA upfront.</span>
              </div>
            </div>

            <div className={styles.mockButtonRow}>
              <div className={styles.mockBtnActive}>
                <MessageCircle className="mr-1 inline h-3 w-3" aria-hidden /> Direct WhatsApp
              </div>
              <div className={styles.mockBtnActive}>
                <Sparkles className="mr-1 inline h-3 w-3" aria-hidden /> Instant Refill
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.valuePillars}>
        <div className={styles.pillar}>
          <span className={styles.pillarIcon}>
            <CheckCircle2 className="h-3 w-3" aria-hidden />
          </span>
          <div>
            <strong>PPB Licence Check</strong>
            <span>Quick check of your premises & superintendent licence against the official register.</span>
          </div>
        </div>

        <div className={styles.pillar}>
          <span className={styles.pillarIcon}>
            <Lock className="h-3 w-3" aria-hidden />
          </span>
          <div>
            <strong>Anti-Clone Lock</strong>
            <span>Locks your pharmacy name & location so copycats and unlicensed quacks can&apos;t pretend to be you.</span>
          </div>
        </div>

        <div className={styles.pillar}>
          <span className={styles.pillarIcon}>
            <Smartphone className="h-3 w-3" aria-hidden />
          </span>
          <div>
            <strong>M-PESA Handshake</strong>
            <span>1-second STK test links your Till or Paybill directly for automated patient payouts.</span>
          </div>
        </div>
      </div>

      <div className={styles.costAnchor}>
        <span className={styles.costAnchorHighlight}>
          💰 KES 100 once · Price of chai &amp; mandazi
        </span>
        <span className={styles.costAnchorText}>
          Keeps you verified for life. KES 0 monthly until you choose to turn on live orders.
        </span>
      </div>
    </div>
  );
}
