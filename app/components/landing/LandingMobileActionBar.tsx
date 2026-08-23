"use client";

import Link from "next/link";
import { MapPin, MessageCircle, Pill, Sparkles } from "lucide-react";

export default function LandingMobileActionBar() {
  return (
    <aside
      aria-label="Mobile quick actions"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_25px_rgba(15,23,42,0.08)] backdrop-blur-lg lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-around gap-1">
        <Link
          href="/pharmacies"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-center text-[11px] font-semibold text-[#0f172a] transition active:bg-slate-100"
        >
          <MapPin className="h-4 w-4 text-[#c9a227]" />
          <span>Find Care</span>
        </Link>

        <Link
          href="/refill"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-center text-[11px] font-semibold text-[#0f172a] transition active:bg-slate-100"
        >
          <Pill className="h-4 w-4 text-[#c9a227]" />
          <span>Refill Rx</span>
        </Link>

        <Link
          href="/how-do-you-feel"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-center text-[11px] font-semibold text-[#0f172a] transition active:bg-slate-100"
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>AI Triage</span>
        </Link>

        <a
          href="https://wa.me/254790670542?text=Hello%20Aether%20Care%20Team,%20I%20have%20an%20urgent%20prescription%20inquiry."
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-center text-[11px] font-semibold text-[#0f172a] transition active:bg-slate-100"
        >
          <MessageCircle className="h-4 w-4 text-[#0c352f]" />
          <span>WhatsApp</span>
        </a>
      </div>
    </aside>
  );
}
