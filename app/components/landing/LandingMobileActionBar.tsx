"use client";

import { useRef, useState } from "react";
import { LoaderCircle, MessageCircle, Pill, Search, Sparkles } from "lucide-react";

type ActionId = "care" | "refill" | "triage" | "whatsapp";

const ACTIONS = [
  { id: "care" as const, label: "Find Care", loading: "Finding care…", href: "/pharmacies", Icon: Search, iconClass: "text-[#6ee7b7]" },
  { id: "refill" as const, label: "Refill Rx", loading: "Opening refill…", href: "/refill", Icon: Pill, iconClass: "text-[#f5d76e]" },
  { id: "triage" as const, label: "AI Triage", loading: "Starting triage…", href: "/how-do-you-feel", Icon: Sparkles, iconClass: "text-[#fbbf24]" },
  { id: "whatsapp" as const, label: "WhatsApp", loading: "Opening WhatsApp…", href: "https://wa.me/254790670542?text=Hello%20Aether%20Care%20Team,%20I%20have%20an%20urgent%20prescription%20inquiry.", Icon: MessageCircle, iconClass: "text-[#86efac]" },
];

export default function LandingMobileActionBar() {
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const navigationStarted = useRef(false);

  const showFeedback = (id: ActionId) => {
    if (navigationStarted.current) return false;
    setActiveAction(id);
    return true;
  };

  const navigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: ActionId,
    href: string,
  ) => {
    event.preventDefault();
    if (!showFeedback(id)) return;
    navigationStarted.current = true;

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.location.href = href;
      }, 180);
    });
  };

  const actionClass = (id: ActionId) => {
    const isActive = activeAction === id;
    const isBlocked = Boolean(activeAction) && !isActive;

    return `relative flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-1 text-center text-[10px] font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06110e] ${
      isActive
        ? "scale-[0.94] border border-emerald-300/30 bg-emerald-400/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_0_22px_rgba(52,211,153,.12)]"
        : isBlocked
          ? "pointer-events-none opacity-40"
          : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[.07] active:scale-[0.94] active:bg-emerald-400/10"
    }`;
  };

  const content = (
    id: ActionId,
    label: string,
    loading: string,
    Icon: typeof Search,
    iconClass: string,
  ) => {
    const isActive = activeAction === id;

    return (
      <>
        <span className={`relative z-10 flex h-7 w-7 items-center justify-center transition-transform duration-200 ${isActive ? "scale-110 rounded-full bg-white/10 shadow-[0_0_16px_rgba(110,231,183,.18)]" : ""}`}>
          {isActive ? <LoaderCircle className="h-5 w-5 animate-spin text-emerald-200" aria-hidden /> : <Icon className={`h-[18px] w-[18px] ${iconClass}`} aria-hidden />}
        </span>
        <span className="relative z-10 max-w-full truncate leading-tight">{isActive ? loading : label}</span>
        {isActive && <>
          <span className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-emerald-300/10" />
          <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-emerald-300 animate-pulse" />
        </>}
      </>
    );
  };

  return (
    <aside
      aria-label="Mobile quick actions"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#06110e]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-12px_36px_rgba(0,0,0,.38)] backdrop-blur-2xl lg:hidden"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />
      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-4 gap-1.5" aria-busy={Boolean(activeAction)}>
          {ACTIONS.map(({ id, label, loading, href, Icon, iconClass }) => {
            const isWhatsapp = id === "whatsapp";
            return (
              <a
                key={id}
                href={href}
                target={isWhatsapp ? "_blank" : undefined}
                rel={isWhatsapp ? "noopener noreferrer" : undefined}
                onPointerDown={() => showFeedback(id)}
                onClick={(event) => {
                  if (isWhatsapp) return;
                  navigate(event, id, href);
                }}
                aria-label={activeAction === id ? loading : label}
                className={actionClass(id)}
              >
                {content(id, label, loading, Icon, iconClass)}
              </a>
            );
          })}
        </div>

        <div className="mt-1 flex h-3 items-center justify-center" aria-live="polite" aria-atomic="true">
          {activeAction && <span className="text-[9px] font-medium text-emerald-100/65">{ACTIONS.find((action) => action.id === activeAction)?.loading}</span>}
        </div>
      </div>
    </aside>
  );
}
