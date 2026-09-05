"use client";

import Link from "next/link";
import { Search, UserRound, HeartPulse } from "lucide-react";

/** Network actions begin with pharmacy selection; clinical work is tenant scoped. */
export default function LandingMobileActionBar() {
  return (
    <nav aria-label="Quick care actions" className="care-dock lg:hidden">
      <Link href="/pharmacies" className="care-dock-primary"><Search size={19} aria-hidden="true" /><span>Find a pharmacy</span></Link>
      <Link href="/health"><HeartPulse size={19} aria-hidden="true" /><span>Health guides</span></Link>
      <Link href="/portal"><UserRound size={19} aria-hidden="true" /><span>My care</span></Link>
    </nav>
  );
}
