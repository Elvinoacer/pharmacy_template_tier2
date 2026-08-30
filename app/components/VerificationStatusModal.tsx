"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "./Modal";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type Decision = {
  id: string;
  name: string;
  slug: string;
  status: "approved" | "rejected" | "needs_info";
  notes: string | null;
  decidedAt: string;
};

const STORAGE_PREFIX = "aether_verify_seen_";

function seenKey(d: Decision) {
  return `${STORAGE_PREFIX}${d.id}_${d.status}_${d.decidedAt}`;
}

function wasSeen(d: Decision): boolean {
  try {
    return localStorage.getItem(seenKey(d)) === "1";
  } catch {
    return false;
  }
}

function markSeen(d: Decision) {
  try {
    localStorage.setItem(seenKey(d), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export default function VerificationStatusModal() {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/verification-status", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { success?: boolean; data?: Decision[] };
        if (!json.success || !json.data?.length || cancelled) return;

        const unseen = json.data.find((d) => !wasSeen(d));
        if (!unseen || cancelled) return;
        setDecision(unseen);
        setOpen(true);
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (decision) markSeen(decision);
    setOpen(false);
    setDecision(null);
  }, [decision]);

  if (!decision) return null;

  const isApproved = decision.status === "approved";
  const isRejected = decision.status === "rejected";
  const isNeedsInfo = decision.status === "needs_info";

  const title = isApproved
    ? "Your pharmacy has been verified"
    : isRejected
      ? "Application update"
      : "More information needed";

  const Icon = isApproved ? CheckCircle2 : isRejected ? AlertCircle : Info;
  const iconClass = isApproved
    ? "text-emerald-600"
    : isRejected
      ? "text-red-600"
      : "text-amber-600";

  const ctaHref = isApproved
    ? "/admin/setup"
    : isNeedsInfo
      ? "/onboard"
      : "/for-pharmacies";
  const ctaLabel = isApproved
    ? "Continue to setup"
    : isNeedsInfo
      ? "Update application"
      : "Back to for pharmacies";

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={
        <span className="inline-flex items-center gap-2">
          <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
          {title}
        </span>
      }
      footer={
        <>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-[#d5e0da] bg-white px-4 py-2 text-sm font-medium text-[#3d4f47] transition hover:bg-[#f4f7f4]"
          >
            Dismiss
          </button>
          <Link
            href={ctaHref}
            onClick={dismiss}
            className="rounded-full bg-[#0d6e5a] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a5c4b]"
          >
            {ctaLabel}
          </Link>
        </>
      }
    >
      <p className="mb-3 text-[#3d4f47]">
        <strong className="text-[#0c1a14]">{decision.name}</strong>
        {isApproved && (
          <>
            {" "}has been approved to join the Aether Pharmacy Network. Finish the setup checklist
            to list your storefront when you are ready.
          </>
        )}
        {isRejected && (
          <>
            {" "}was not approved at this time. You can review the reason below and contact support
            if you have additional documentation.
          </>
        )}
        {isNeedsInfo && (
          <>
            {" "}needs a few more details before verification can complete. Update and resubmit from
            onboarding.
          </>
        )}
      </p>
      {decision.notes ? (
        <div className="rounded-xl border border-[#e3ebe6] bg-[#f8faf8] px-4 py-3 text-sm text-[#3d4f47]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#8a9a92]">
            {isRejected ? "Reason" : isNeedsInfo ? "What we need" : "Note"}
          </p>
          <p className="whitespace-pre-wrap">{decision.notes}</p>
        </div>
      ) : null}
    </Modal>
  );
}
