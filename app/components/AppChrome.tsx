"use client";

import { usePathname } from "next/navigation";
import AiChatbot from "./AiChatbot";
import Footer from "./Footer";
import Navbar from "./Navbar";
import { LiveAlertCenter } from "./LiveAlertCenter";

const BARE_PREFIXES = ["/portal", "/admin", "/login", "/register", "/forgot-password", "/reset-password", "/caregiver"];

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const bare = BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="mesh-bg relative flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <AiChatbot />
      {/* Guest How-do-you-feel pharmacist replies even when browsing the public site */}
      <LiveAlertCenter audience="public" />
    </div>
  );
}
