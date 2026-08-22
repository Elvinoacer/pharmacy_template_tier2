"use client";

import Link from "next/link";
import { Search, Pill, Sparkles, MessageCircle } from "lucide-react";

export default function LandingMobileActionBar() {
  const scrollToDirectory = (e: React.MouseEvent) => {
    const el = document.getElementById("pharmacies");
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <aside
      aria-label="Mobile quick actions"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-4px_25px_rgba(15,23,42,0.08)] backdrop-blur-lg lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-around gap-1">
        <a
          href="#pharmacies"
          onClick={scrollToDirectory}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-center text-[11px] font-semibold text-[#0f172a] transition active:bg-slate-100"
        >
          <Search className="h-4 w-4 text-[#c9a227]" />
          <span>Find Care</span>
        </a>

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
