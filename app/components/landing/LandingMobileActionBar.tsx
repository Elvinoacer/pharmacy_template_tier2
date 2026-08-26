"use client";

import { useRef, useState } from "react";
import { LoaderCircle, MessageCircle, Pill, Search, Sparkles } from "lucide-react";

type ActionId = "care" | "refill" | "triage" | "whatsapp";

const ACTIONS = [
  { id: "care" as const, label: "Find Care", loading: "Finding care…", href: "/pharmacies", Icon: Search, iconClass: "text-[#78f0bd]" },
  { id: "refill" as const, label: "Refill Rx", loading: "Opening refill…", href: "/refill", Icon: Pill, iconClass: "text-[#f4dc78]" },
  { id: "triage" as const, label: "AI Triage", loading: "Starting triage…", href: "/how-do-you-feel", Icon: Sparkles, iconClass: "text-[#fbbf24]" },
  { id: "whatsapp" as const, label: "WhatsApp", loading: "Opening WhatsApp…", href: "https://wa.me/254790670542?text=Hello%20Aether%20Care%20Team,%20I%20have%20an%20urgent%20prescription%20inquiry.", Icon: MessageCircle, iconClass: "text-[#8af5b0]" },
];

export default function LandingMobileActionBar() {
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const navigationStarted = useRef(false);

  const showFeedback = (id: ActionId) => {
    if (navigationStarted.current) return false;
    setActiveAction(id);
    return true;
  };

  const navigate = (event: React.MouseEvent<HTMLAnchorElement>, id: ActionId, href: string) => {
    event.preventDefault();
    if (!showFeedback(id)) return;
    navigationStarted.current = true;

    // Let the "living" selection animation bloom before navigation.
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.location.href = href;
      }, 360);
    });
  };

  return (
    <aside aria-label="Mobile quick actions" className="living-action-dock fixed bottom-0 left-0 right-0 z-40 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 lg:hidden">
      <style jsx>{`
        .living-action-dock {
          isolation: isolate;
          background:
            radial-gradient(110% 90% at 50% 110%, rgba(24, 116, 82, .26), transparent 55%),
            linear-gradient(180deg, rgba(8, 22, 18, .88), rgba(3, 10, 8, .97));
          border-top: 1px solid rgba(255,255,255,.08);
          box-shadow: 0 -18px 48px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.025);
          backdrop-filter: blur(26px) saturate(1.35);
        }
        .living-action-dock::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          opacity: .72;
          background: radial-gradient(circle at var(--x, 50%) 18%, rgba(101, 255, 186, .10), transparent 22%);
          transition: background 520ms cubic-bezier(.16,1,.3,1);
        }
        .living-action-dock::after {
          content: "";
          position: absolute;
          top: -1px;
          left: 50%;
          width: 38%;
          height: 1px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, rgba(119,255,188,.8), transparent);
          filter: blur(.2px);
          animation: breathe-line 4s ease-in-out infinite;
        }
        .living-tab {
          position: relative;
          display: flex;
          min-height: 66px;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          overflow: visible;
          border-radius: 19px;
          padding: 5px 2px 7px;
          color: rgba(226,232,240,.78);
          font-size: 10px;
          font-weight: 650;
          letter-spacing: -.01em;
          transition: color 280ms ease, transform 220ms cubic-bezier(.2,1.4,.35,1), filter 280ms ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .living-tab::before {
          content: "";
          position: absolute;
          inset: 3px 4px;
          z-index: -1;
          border: 1px solid rgba(137,255,195,0);
          border-radius: inherit;
          background: radial-gradient(circle at 50% 0%, rgba(102,255,185,.17), rgba(15,43,34,.48) 58%, rgba(3,12,9,.24));
          opacity: 0;
          transform: scale(.78) translateY(9px);
          transition: opacity 220ms ease, transform 420ms cubic-bezier(.16,1.35,.3,1), border-color 350ms ease;
        }
        .living-tab:active { transform: scale(.88) translateY(3px); }
        .living-tab:active::before { opacity: .55; transform: scale(.96); }
        .living-tab[data-active="true"] { color: #f2fff8; transform: translateY(-4px); }
        .living-tab[data-active="true"]::before {
          opacity: 1;
          transform: scale(1) translateY(0);
          border-color: rgba(134,255,194,.22);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.09), 0 7px 25px rgba(37, 192, 125, .12);
          animation: cell-bloom 700ms cubic-bezier(.16,1.2,.3,1) both;
        }
        .living-icon-shell {
          position: relative;
          z-index: 2;
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          border-radius: 999px;
          transition: transform 420ms cubic-bezier(.16,1.45,.3,1), background 300ms ease, box-shadow 400ms ease;
        }
        .living-tab[data-active="true"] .living-icon-shell {
          background: rgba(114,255,185,.13);
          transform: translateY(-3px) scale(1.12);
          box-shadow: 0 0 0 7px rgba(87,245,166,.035), 0 0 25px rgba(83,255,169,.22);
          animation: organ-beat 1.15s ease-in-out infinite;
        }
        .living-tab[data-active="true"] .living-icon { animation: icon-pop 620ms cubic-bezier(.16,1.5,.3,1) both; }
        .living-label { position: relative; z-index: 2; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .living-tab[data-active="true"] .living-label { animation: label-rise 460ms cubic-bezier(.16,1.25,.3,1) both; }
        .living-ring {
          position: absolute;
          z-index: 1;
          width: 36px;
          height: 36px;
          border: 1px solid rgba(121,255,189,.42);
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
        }
        .living-tab[data-active="true"] .living-ring { animation: ripple 900ms cubic-bezier(.08,.7,.2,1) both; }
        .living-ring:nth-of-type(2) { animation-delay: 130ms !important; }
        .living-orb {
          position: absolute;
          top: 7px;
          left: 50%;
          z-index: 0;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #9fffd0;
          opacity: 0;
          filter: blur(.2px);
          box-shadow: 0 0 9px rgba(125,255,191,.9);
        }
        .living-tab[data-active="true"] .living-orb { animation: synapse 680ms cubic-bezier(.18,.8,.25,1) both; }
        .living-tab[data-active="true"] .living-orb:nth-of-type(2) { animation-delay: 70ms; transform-origin: -16px 20px; }
        .living-tab[data-active="true"] .living-orb:nth-of-type(3) { animation-delay: 130ms; transform-origin: 18px 22px; }
        .living-indicator {
          position: absolute;
          bottom: 1px;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #9bffd0;
          opacity: 0;
          box-shadow: 0 0 12px rgba(113,255,184,.9);
          transition: width 420ms cubic-bezier(.16,1.25,.3,1), opacity 250ms ease;
        }
        .living-tab[data-active="true"] .living-indicator { width: 24px; opacity: 1; animation: indicator-breathe 1.4s ease-in-out infinite; }
        @keyframes breathe-line { 0%,100% { opacity:.34; width:24%; } 50% { opacity:1; width:46%; } }
        @keyframes cell-bloom { 0% { opacity:.2; transform:scale(.72) translateY(12px); } 62% { transform:scale(1.035) translateY(-1px); } 100% { opacity:1; transform:scale(1); } }
        @keyframes organ-beat { 0%,100% { transform:translateY(-3px) scale(1.12); } 44% { transform:translateY(-4px) scale(1.2); } 62% { transform:translateY(-3px) scale(1.1); } }
        @keyframes icon-pop { 0% { transform:scale(.55) rotate(-12deg); opacity:0; } 60% { transform:scale(1.22) rotate(5deg); opacity:1; } 100% { transform:scale(1); rotate:0deg; } }
        @keyframes label-rise { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ripple { 0% { opacity:.9; transform:scale(.45); } 100% { opacity:0; transform:scale(2.4); } }
        @keyframes synapse { 0% { opacity:0; transform:translate(-50%, 0) scale(.3); } 28% { opacity:1; } 100% { opacity:0; transform:translate(-50%, 30px) scale(1); } }
        @keyframes indicator-breathe { 0%,100% { box-shadow:0 0 7px rgba(113,255,184,.5); } 50% { box-shadow:0 0 18px rgba(113,255,184,1); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
        }
      `}</style>

      <div className="mx-auto max-w-md">
        <div className="grid grid-cols-4 gap-1" aria-busy={Boolean(activeAction)}>
          {ACTIONS.map(({ id, label, loading, href, Icon, iconClass }) => {
            const isActive = activeAction === id;
            const isWhatsapp = id === "whatsapp";
            return (
              <a
                key={id}
                href={href}
                target={isWhatsapp ? "_blank" : undefined}
                rel={isWhatsapp ? "noopener noreferrer" : undefined}
                data-active={isActive}
                onPointerDown={(event) => {
                  const dock = event.currentTarget.closest(".living-action-dock") as HTMLElement | null;
                  if (dock) dock.style.setProperty("--x", `${event.clientX}px`);
                  showFeedback(id);
                }}
                onClick={(event) => {
                  if (isWhatsapp) return;
                  navigate(event, id, href);
                }}
                aria-label={isActive ? loading : label}
                className="living-tab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/80"
              >
                <span className="living-ring" aria-hidden />
                <span className="living-ring" aria-hidden />
                <span className="living-orb" aria-hidden />
                <span className="living-orb" aria-hidden />
                <span className="living-orb" aria-hidden />
                <span className="living-icon-shell">
                  {isActive ? <LoaderCircle className="living-icon h-5 w-5 animate-spin text-emerald-100" aria-hidden /> : <Icon className={`living-icon h-[19px] w-[19px] ${iconClass}`} aria-hidden />}
                </span>
                <span className="living-label">{isActive ? loading : label}</span>
                <span className="living-indicator" aria-hidden />
              </a>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
