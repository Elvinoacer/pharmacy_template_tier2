"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Pill, Search, Sparkles } from "lucide-react";

type ActionId = "care" | "refill" | "triage" | "whatsapp";
const ACTIONS = [
 { id:"care" as const,label:"Find Care",href:"/pharmacies",Icon:Search,iconClass:"text-[#78f0bd]" },
 { id:"refill" as const,label:"Refill Rx",href:"/refill",Icon:Pill,iconClass:"text-[#f4dc78]" },
 { id:"triage" as const,label:"AI Triage",href:"/how-do-you-feel",Icon:Sparkles,iconClass:"text-[#fbbf24]" },
 { id:"whatsapp" as const,label:"WhatsApp",href:"https://wa.me/254790670542?text=Hello%20Aether%20Care%20Team,%20I%20have%20an%20urgent%20prescription%20inquiry.",Icon:MessageCircle,iconClass:"text-[#8af5b0]" },
];

export default function LandingMobileActionBar(){
 const [activeAction,setActiveAction]=useState<ActionId|null>(null);
 const [visible,setVisible]=useState(true);
 const lastY=useRef(0),ticking=useRef(false);
 useEffect(()=>{
  lastY.current=window.scrollY;
  const existing=document.querySelector('meta[name="theme-color"]');
  const previous=existing?.getAttribute("content") ?? null;
  const created=!existing;
  const meta=(existing instanceof HTMLMetaElement ? existing : document.createElement("meta"));
  if(created){meta.name="theme-color";document.head.appendChild(meta);}
  meta.content="#020b08";
  document.documentElement.style.colorScheme="dark";
  const onScroll=()=>{if(ticking.current)return;ticking.current=true;requestAnimationFrame(()=>{const y=window.scrollY,d=y-lastY.current;if(y<24)setVisible(true);else if(d>8)setVisible(false);else if(d<-5)setVisible(true);lastY.current=y;ticking.current=false;});};
  window.addEventListener("scroll",onScroll,{passive:true});
  return()=>{window.removeEventListener("scroll",onScroll);if(created)meta.remove();else if(previous!==null)meta.content=previous;else meta.removeAttribute("content");};
 },[]);
 return <aside data-visible={visible} aria-label="Mobile quick actions" className="living-action-dock fixed bottom-0 left-0 right-0 z-40 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 lg:hidden">
 <style jsx>{`
 .living-action-dock{isolation:isolate;overflow:hidden;will-change:transform,opacity;transition:transform 340ms cubic-bezier(.22,1,.36,1),opacity 220ms ease;background:linear-gradient(180deg,rgba(9,27,21,.91),rgba(2,11,8,.985));border-top:1px solid rgba(151,255,207,.16);box-shadow:0 -18px 52px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(28px) saturate(1.45)}.living-action-dock[data-visible="false"]{transform:translate3d(0,calc(100% + env(safe-area-inset-bottom) + 2px),0);opacity:0;pointer-events:none}
 .living-action-dock:before{content:"";position:absolute;inset:-18% -8%;z-index:-1;background:radial-gradient(ellipse at 16% 65%,rgba(69,255,155,.18),transparent 22%),radial-gradient(ellipse at 50% 40%,rgba(21,173,104,.14),transparent 28%),radial-gradient(ellipse at 85% 70%,rgba(92,255,176,.14),transparent 21%);filter:blur(10px);animation:cyto 9s ease-in-out infinite alternate}.living-action-dock:after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.72;background:linear-gradient(118deg,transparent 9%,rgba(129,255,191,.075) 10%,transparent 11% 31%,rgba(255,255,255,.05) 32%,transparent 33% 54%,rgba(115,255,186,.07) 55%,transparent 56% 78%,rgba(255,255,255,.045) 79%,transparent 80%);animation:shift 12s ease-in-out infinite alternate}
 .living-tab{position:relative;display:flex;min-height:66px;min-width:0;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:19px;padding:5px 2px 7px;color:rgba(226,232,240,.8);font-size:10px;font-weight:650;transition:color .24s,transform .22s cubic-bezier(.2,1.4,.35,1);-webkit-tap-highlight-color:transparent;touch-action:manipulation}.living-tab:before{content:"";position:absolute;inset:2px 3px;z-index:-1;clip-path:polygon(6% 0,27% 4%,47% 0,69% 5%,93% 1%,100% 23%,95% 47%,100% 76%,90% 100%,65% 95%,45% 100%,21% 94%,0 78%,5% 52%,0 24%);background:linear-gradient(135deg,rgba(127,255,194,.20),rgba(16,58,43,.72) 48%,rgba(3,15,10,.48));border:1px solid rgba(143,255,202,.14);box-shadow:inset 0 1px rgba(255,255,255,.07);opacity:.72;animation:breathe 5.6s ease-in-out infinite}.living-tab:nth-child(2):before{animation-delay:-1.4s}.living-tab:nth-child(3):before{animation-delay:-2.8s}.living-tab:nth-child(4):before{animation-delay:-4.1s}.living-tab:active{transform:scale(.93) translateY(1px)}.living-tab[data-active="true"]{color:#f2fff8;transform:translateY(-3px)}.living-tab[data-active="true"]:before{opacity:1;border-color:rgba(149,255,205,.3);box-shadow:0 8px 26px rgba(37,192,125,.14)}
 .living-icon-shell{position:relative;z-index:2;display:grid;width:30px;height:30px;place-items:center;border-radius:50%;transition:.36s cubic-bezier(.16,1.35,.3,1)}.living-tab[data-active="true"] .living-icon-shell{background:rgba(114,255,185,.15);transform:translateY(-2px) scale(1.08);box-shadow:0 0 0 7px rgba(87,245,166,.05),0 0 24px rgba(83,255,169,.23)}.living-label{position:relative;z-index:2;white-space:nowrap}.living-indicator{position:absolute;bottom:2px;width:5px;height:5px;border-radius:99px;background:#9bffd0;opacity:0;box-shadow:0 0 12px rgba(113,255,184,.8);transition:.36s}.living-tab[data-active="true"] .living-indicator{width:23px;opacity:1}
 .tissue-fragment{position:absolute;z-index:1;pointer-events:none;border:1px solid rgba(169,255,214,.2);background:linear-gradient(145deg,rgba(132,255,196,.11),rgba(255,255,255,.025));backdrop-filter:blur(5px);animation:drift 8s ease-in-out infinite alternate}.f1{width:48px;height:29px;left:-9px;top:8px;clip-path:polygon(0 22%,76% 0,100% 52%,58% 100%,0 78%)}.f2{width:60px;height:34px;left:18%;top:1px;clip-path:polygon(0 16%,70% 0,100% 40%,82% 100%,20% 88%);animation-delay:-2s}.f3{width:42px;height:25px;left:46%;top:11px;clip-path:polygon(0 0,100% 25%,78% 100%,12% 88%);animation-delay:-4s}.f4{width:55px;height:34px;right:16%;top:2px;clip-path:polygon(15% 0,100% 18%,86% 100%,0 74%);animation-delay:-1s}.f5{width:49px;height:28px;right:-7px;top:17px;clip-path:polygon(0 35%,55% 0,100% 40%,72% 100%,8% 78%);animation-delay:-5s}.f6{width:70px;height:21px;left:30%;bottom:3px;clip-path:polygon(0 20%,33% 0,100% 35%,76% 100%,15% 82%);animation-delay:-3s}.f7{width:44px;height:21px;right:29%;bottom:0;clip-path:polygon(0 0,100% 25%,78% 100%,12% 76%);animation-delay:-6s}.pulse{position:absolute;z-index:1;pointer-events:none;width:8px;height:8px;border-radius:50%;background:rgba(115,255,185,.85);filter:blur(1px);box-shadow:0 0 16px rgba(90,255,167,.75);animation:flow 6s linear infinite}.p1{left:-4%;top:58%}.p2{left:18%;top:34%;animation-delay:-2.1s}.p3{left:44%;top:72%;animation-delay:-4s}.p4{left:68%;top:30%;animation-delay:-1.2s}.p5{left:91%;top:61%;animation-delay:-3.4s}
 @keyframes breathe{50%{transform:scale(1.022);filter:brightness(1.15)}}@keyframes cyto{50%{transform:translate3d(3%,-3%,0) scale(1.08)}}@keyframes shift{to{transform:translateX(2%);opacity:.82}}@keyframes drift{to{transform:translateY(-2px) scale(1.035);opacity:.9}}@keyframes flow{0%{transform:translateX(-18px) scale(.45);opacity:0}12%{opacity:.9}55%{transform:translateX(48vw) scale(1.1);opacity:.75}100%{transform:translateX(92vw) scale(.45);opacity:0}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition-duration:.01ms!important}}
 `}</style>
 <span className="tissue-fragment f1"/><span className="tissue-fragment f2"/><span className="tissue-fragment f3"/><span className="tissue-fragment f4"/><span className="tissue-fragment f5"/><span className="tissue-fragment f6"/><span className="tissue-fragment f7"/><span className="pulse p1"/><span className="pulse p2"/><span className="pulse p3"/><span className="pulse p4"/><span className="pulse p5"/>
 <div className="relative z-10 mx-auto max-w-md"><div className="grid grid-cols-4 gap-1">{ACTIONS.map(({id,label,href,Icon,iconClass})=>{const active=activeAction===id,whatsapp=id==="whatsapp";return <a key={id} href={href} target={whatsapp?"_blank":undefined} rel={whatsapp?"noopener noreferrer":undefined} data-active={active} onPointerDown={()=>setActiveAction(id)} onClick={()=>setActiveAction(id)} aria-label={label} className="living-tab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/80"><span className="living-icon-shell"><Icon className={`h-[19px] w-[19px] ${iconClass}`}/></span><span className="living-label">{label}</span><span className="living-indicator"/></a>})}</div></div>
 </aside>;
}
