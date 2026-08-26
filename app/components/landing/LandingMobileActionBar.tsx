"use client";

import { useState } from "react";
import { MessageCircle, Pill, Search, Sparkles } from "lucide-react";

type ActionId = "care" | "refill" | "triage" | "whatsapp";

const ACTIONS = [
  { id: "care" as const, label: "Find Care", href: "/pharmacies", Icon: Search, iconClass: "text-[#78f0bd]" },
  { id: "refill" as const, label: "Refill Rx", href: "/refill", Icon: Pill, iconClass: "text-[#f4dc78]" },
  { id: "triage" as const, label: "AI Triage", href: "/how-do-you-feel", Icon: Sparkles, iconClass: "text-[#fbbf24]" },
  { id: "whatsapp" as const, label: "WhatsApp", href: "https://wa.me/254790670542?text=Hello%20Aether%20Care%20Team,%20I%20have%20an%20urgent%20prescription%20inquiry.", Icon: MessageCircle, iconClass: "text-[#8af5b0]" },
];

export default function LandingMobileActionBar() {
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);

  return (
    <aside aria-label="Mobile quick actions" className="living-action-dock fixed bottom-0 left-0 right-0 z-40 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 lg:hidden">
      <style jsx>{`
        .living-action-dock {
          isolation:isolate; overflow:hidden;
          background:linear-gradient(180deg,rgba(8,22,18,.88),rgba(3,10,8,.97));
          border-top:1px solid rgba(255,255,255,.08);
          box-shadow:0 -18px 48px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.025);
          backdrop-filter:blur(26px) saturate(1.35);
        }
        .living-action-dock::before {
          content:""; position:absolute; inset:0; z-index:-1; pointer-events:none;
          background:
            linear-gradient(116deg,transparent 0 8%,rgba(112,255,188,.035) 8.3% 9.1%,transparent 9.4% 28%,rgba(255,255,255,.028) 28.3% 29%,transparent 29.3% 51%,rgba(105,255,184,.035) 51.2% 52%,transparent 52.3% 74%,rgba(255,255,255,.025) 74.3% 75%,transparent 75.3%),
            radial-gradient(110% 90% at 50% 110%,rgba(24,116,82,.22),transparent 55%);
        }
        .living-action-dock::after { content:""; position:absolute; inset:0; pointer-events:none; opacity:.45; background-image:linear-gradient(125deg,transparent 48%,rgba(255,255,255,.045) 49%,transparent 50%); background-size:72px 100%; mask-image:linear-gradient(90deg,transparent,black 10%,black 90%,transparent); }
        .living-tab { position:relative; display:flex; min-height:66px; min-width:0; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:19px; padding:5px 2px 7px; color:rgba(226,232,240,.78); font-size:10px; font-weight:650; transition:color 240ms ease,transform 220ms cubic-bezier(.2,1.4,.35,1); -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
        .living-tab::before { content:""; position:absolute; inset:3px 4px; z-index:-1; clip-path:polygon(7% 0,28% 4%,47% 0,67% 5%,92% 0,100% 22%,96% 47%,100% 76%,90% 100%,65% 96%,45% 100%,22% 95%,0 78%,4% 52%,0 25%); background:linear-gradient(135deg,rgba(120,255,190,.13),rgba(12,42,33,.58) 48%,rgba(3,12,9,.35)); border-radius:22px; opacity:.45; }
        .living-tab::after { content:""; position:absolute; inset:7px 8px; z-index:-1; clip-path:polygon(0 8%,26% 0,49% 7%,74% 1%,100% 14%,94% 43%,100% 72%,79% 100%,52% 93%,24% 100%,0 82%,7% 52%); border:1px solid rgba(143,255,202,.12); opacity:.45; }
        .living-tab:active { transform:scale(.93) translateY(1px); }
        .living-tab[data-active="true"] { color:#f2fff8; transform:translateY(-3px); }
        .living-tab[data-active="true"]::before { opacity:1; box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 8px 24px rgba(37,192,125,.1); }
        .living-icon-shell { position:relative; z-index:2; display:grid; width:30px; height:30px; place-items:center; border-radius:50%; transition:transform 360ms cubic-bezier(.16,1.35,.3,1),background 260ms ease,box-shadow 300ms ease; }
        .living-tab[data-active="true"] .living-icon-shell { background:rgba(114,255,185,.12); transform:translateY(-2px) scale(1.08); box-shadow:0 0 0 6px rgba(87,245,166,.035),0 0 22px rgba(83,255,169,.18); }
        .living-label { position:relative; z-index:2; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .living-indicator { position:absolute; bottom:2px; width:5px; height:5px; border-radius:999px; background:#9bffd0; opacity:0; box-shadow:0 0 12px rgba(113,255,184,.7); transition:width 360ms cubic-bezier(.16,1.2,.3,1),opacity 220ms ease; }
        .living-tab[data-active="true"] .living-indicator { width:23px; opacity:1; }
        .tissue-fragment { position:absolute; z-index:1; pointer-events:none; border:1px solid rgba(169,255,214,.11); background:linear-gradient(145deg,rgba(132,255,196,.055),rgba(255,255,255,.012)); backdrop-filter:blur(4px); }
        .f1{width:42px;height:26px;left:-9px;top:9px;clip-path:polygon(0 22%,76% 0,100% 52%,58% 100%,0 78%)}
        .f2{width:54px;height:30px;left:19%;top:2px;clip-path:polygon(0 16%,70% 0,100% 40%,82% 100%,20% 88%)}
        .f3{width:36px;height:22px;left:46%;top:12px;clip-path:polygon(0 0,100% 25%,78% 100%,12% 88%)}
        .f4{width:48px;height:31px;right:17%;top:3px;clip-path:polygon(15% 0,100% 18%,86% 100%,0 74%)}
        .f5{width:43px;height:25px;right:-7px;top:18px;clip-path:polygon(0 35%,55% 0,100% 40%,72% 100%,8% 78%)}
        .f6{width:62px;height:18px;left:31%;bottom:4px;clip-path:polygon(0 20%,33% 0,100% 35%,76% 100%,15% 82%);opacity:.65}
        .f7{width:38px;height:18px;right:30%;bottom:1px;clip-path:polygon(0 0,100% 25%,78% 100%,12% 76%);opacity:.55}
        .seam { position:absolute; z-index:1; top:7px; bottom:7px; width:1px; background:linear-gradient(transparent,rgba(151,255,207,.11),transparent); transform:rotate(12deg); pointer-events:none; }
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition-duration:.01ms!important}}
      `}</style>
      <span className="tissue-fragment f1"/><span className="tissue-fragment f2"/><span className="tissue-fragment f3"/><span className="tissue-fragment f4"/><span className="tissue-fragment f5"/><span className="tissue-fragment f6"/><span className="tissue-fragment f7"/>
      <span className="seam" style={{left:"12%"}}/><span className="seam" style={{left:"38%"}}/><span className="seam" style={{left:"64%"}}/><span className="seam" style={{left:"88%"}}/>
      <div className="relative z-10 mx-auto max-w-md"><div className="grid grid-cols-4 gap-1">
        {ACTIONS.map(({id,label,href,Icon,iconClass})=>{const isActive=activeAction===id; const isWhatsapp=id==="whatsapp"; return <a key={id} href={href} target={isWhatsapp?"_blank":undefined} rel={isWhatsapp?"noopener noreferrer":undefined} data-active={isActive} onPointerDown={()=>setActiveAction(id)} onClick={()=>setActiveAction(id)} aria-label={label} className="living-tab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/80"><span className="living-icon-shell"><Icon className={`h-[19px] w-[19px] ${iconClass}`} aria-hidden /></span><span className="living-label">{label}</span><span className="living-indicator" aria-hidden /></a>})}
      </div></div>
    </aside>
  );
}
