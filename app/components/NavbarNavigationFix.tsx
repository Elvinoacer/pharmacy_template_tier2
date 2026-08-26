"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Keeps the platform "Find a pharmacy" navigation action aligned with the
 * pharmacy directory's deep-linking behavior. The directory watches
 * `focus=search` and automatically focuses its search input.
 */
export default function NavbarNavigationFix() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    // Storefronts have tenant-scoped navigation and should keep their own links.
    if (pathname.startsWith("/p/")) return;

    const syncFindPharmacyLinks = () => {
      const header = document.querySelector("header");
      if (!header) return;

      header.querySelectorAll<HTMLAnchorElement>("a").forEach((link) => {
        const label = link.textContent?.replace(/\s+/g, " ").trim();
        if (label !== "Find a pharmacy") return;

        const href = link.getAttribute("href");
        if (href === "/" || href === "/#pharmacies") {
          link.setAttribute("href", "/pharmacies?focus=search");
        }
      });
    };

    syncFindPharmacyLinks();

    const observer = new MutationObserver(syncFindPharmacyLinks);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
