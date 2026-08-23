"use client";

import { useRef, useState } from "react";
import { LoaderCircle, MessageCircle, Pill, Search, Sparkles } from "lucide-react";

type ActionId = "care" | "refill" | "triage" | "whatsapp";

const ACTIONS = [
  { id: "care" as const, label: "Find Care", loading: "Finding care…", href: "/pharmacies", Icon: Search, iconClass: "text-[#c9a227]" },
  { id: "refill" as const, label: "Refill Rx", loading: "Opening refill…", href: "/refill", Icon: Pill, iconClass: "text-[#c9a227]" },
  { id: "triage" as const, label: "AI Triage", loading: "Starting triage…", href: "/how-do-you-feel", Icon: Sparkles, iconClass: "text-amber-500" },
  { id: "whatsapp" as const, label: "WhatsApp", loading: "Opening WhatsApp…", href: "https://wa.me/254790670542?text=Hello%20Aether%20Care%20Team,%20I%20have%20an%20urgent%20prescription%20inquiry.", Icon: MessageCircle, iconClass: "text-[#0c352f]" },
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

    // Keep the acknowledgement visible for at least one frame before leaving.
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.location.href = href;
      }, 180);
    });
  };

  const actionClass = (id: ActionId) => {
    const isActive = activeAction === id;
    const isBlocked = Boolean(activeAction) && !isActive;

    return `relative flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[11px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a227] focus-visible:ring-offset-2 ${
      isActive
        ? "scale-[0.96] bg-slate-100 text-slate-950 shadow-inner"
        : isBlocked
          ? "pointer-events-none opacity-45"
          : "text-[#0f172a] hover:bg-slate-50 active:scale-[0.94] active:bg-slate-100"
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
        <span className={`flex h-7 w-7 items-center justify-center ${isActive ? "rounded-full bg-white shadow-sm" : ""}`}>
          {isActive ? <LoaderCircle className="h-5 w-5 animate-spin text-[#b68e16]" aria-hidden /> : <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden />}
        </span>
        <span className="max-w-full truncate leading-tight">{isActive ? loading : label}</span>
        {isActive && <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[#c9a227] animate-pulse" />}
      </>
    );
  };

  return (
    <aside
      aria-label="Mobile quick actions"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-6px_30px_rgba(15,23,42,0.1)] backdrop-blur-xl lg:hidden"
    >
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

        <div className="mt-1 flex h-4 items-center justify-center" aria-live="polite" aria-atomic="true">
          {activeAction && <span className="text-[10px] font-medium text-slate-500">{ACTIONS.find((action) => action.id === activeAction)?.loading}</span>}
        </div>
      </div>
    </aside>
  );
}
