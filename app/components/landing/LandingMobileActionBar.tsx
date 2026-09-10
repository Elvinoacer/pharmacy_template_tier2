"use client";

import Link from "next/link";
import { HeartPulse, RefreshCcw, Search, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const CARE_DOCK_PREFIXES = [
  "/pharmacies",
  "/health",
  "/refill",
  "/order",
  "/medicines",
  "/services",
  "/vaccinations",
  "/preventive",
  "/screenings",
  "/delivery",
  "/search",
  "/how-do-you-feel",
  "/storefront",
] as const;

export function shouldShowMobileCareDock(pathname: string): boolean {
  if (!pathname || pathname === "/") return true;
  if (/^\/p\/[a-z0-9][a-z0-9-]{1,60}(\/|$)/i.test(pathname)) return true;
  return CARE_DOCK_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const ACTIONS = [
  {
    key: "pharmacy",
    href: "/pharmacies",
    label: "Find pharmacy",
    icon: Search,
    active: (pathname: string) =>
      pathname === "/pharmacies" || pathname.startsWith("/pharmacies/"),
  },
  {
    key: "refill",
    href: "/refill",
    label: "Refill",
    icon: RefreshCcw,
    active: (pathname: string) =>
      pathname === "/refill" || pathname.startsWith("/refill/"),
  },
  {
    key: "health",
    href: "/health",
    label: "Health guides",
    icon: HeartPulse,
    active: (pathname: string) =>
      pathname === "/health" || pathname.startsWith("/health/"),
  },
  {
    key: "care",
    href: "/portal",
    label: "My care",
    icon: UserRound,
    active: (pathname: string) =>
      pathname === "/portal" || pathname.startsWith("/portal/"),
  },
] as const;

function keyboardIsOpenOnFormControl(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  return (
    active.tagName === "INPUT" ||
    active.tagName === "TEXTAREA" ||
    active.tagName === "SELECT" ||
    active.isContentEditable
  );
}

/**
 * Shared public mobile care navigation.
 *
 * It stays out of the hero, hides while the user is actively scrolling down,
 * returns when scrolling up or after scroll settles, disappears near the footer,
 * and gets out of the way while a mobile form control is focused.
 */
export default function LandingMobileActionBar() {
  const pathname = usePathname() || "/";
  const eligible = shouldShowMobileCareDock(pathname);
  const [visible, setVisible] = useState(false);
  const lastScrollY = useRef(0);
  const footerNear = useRef(false);
  const idleTimer = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }

    const revealAfter = pathname === "/" ? 300 : 150;
    lastScrollY.current = window.scrollY;

    const clearIdleTimer = () => {
      if (idleTimer.current !== null) {
        window.clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
    };

    const canShow = () =>
      window.scrollY >= revealAfter &&
      !footerNear.current &&
      !keyboardIsOpenOnFormControl();

    const settleVisible = () => {
      setVisible(canShow());
    };

    const evaluateScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      lastScrollY.current = currentY;

      if (!canShow()) {
        setVisible(false);
      } else if (delta < -5) {
        // Scrolling up means the user is looking for navigation again.
        setVisible(true);
      } else if (delta > 9) {
        // Preserve reading space while content is moving beneath the thumb.
        setVisible(false);
      }

      clearIdleTimer();
      idleTimer.current = window.setTimeout(settleVisible, 280);
    };

    const onScroll = () => {
      if (animationFrame.current !== null) return;
      animationFrame.current = window.requestAnimationFrame(() => {
        animationFrame.current = null;
        evaluateScroll();
      });
    };

    const onFocusIn = () => {
      if (keyboardIsOpenOnFormControl()) setVisible(false);
    };

    const onFocusOut = () => {
      clearIdleTimer();
      idleTimer.current = window.setTimeout(settleVisible, 180);
    };

    const footer = document.getElementById("site-footer");
    const observer = footer
      ? new IntersectionObserver(
          ([entry]) => {
            footerNear.current = Boolean(entry?.isIntersecting);
            if (footerNear.current) setVisible(false);
            else settleVisible();
          },
          { rootMargin: "0px 0px 96px 0px", threshold: 0 },
        )
      : null;

    if (footer && observer) observer.observe(footer);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    settleVisible();

    return () => {
      observer?.disconnect();
      clearIdleTimer();
      if (animationFrame.current !== null) {
        window.cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [eligible, pathname]);

  if (!eligible) return null;

  return (
    <nav
      aria-label="Quick care actions"
      aria-hidden={!visible}
      className={`fixed inset-x-2 z-50 grid grid-cols-4 gap-1 rounded-[1.35rem] border border-[var(--line-2)] bg-[var(--card)] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none lg:hidden ${
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-[calc(100%+1rem)] opacity-0"
      }`}
      style={{ bottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        const active = action.active(pathname);
        const featured = pathname === "/" && action.key === "pharmacy";
        const emphasized = active || featured;

        return (
          <Link
            key={action.key}
            href={action.href}
            aria-current={active ? "page" : undefined}
            tabIndex={visible ? undefined : -1}
            className={`group relative flex min-h-[3.65rem] min-w-0 flex-col items-center justify-center gap-1 rounded-[1rem] px-1.5 py-1.5 text-center text-[10px] font-semibold leading-tight transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] ${
              emphasized
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-deep)]"
            }`}
          >
            <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" strokeWidth={2.2} aria-hidden="true" />
            <span className="line-clamp-2 max-w-full">{action.label}</span>
            {active ? (
              <span
                className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-white/80"
                aria-hidden="true"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
