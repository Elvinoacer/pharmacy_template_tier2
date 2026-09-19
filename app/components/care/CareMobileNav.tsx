"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileUp, HeartPulse, Pill, RotateCw, UserRound } from "lucide-react";
import styles from "./CareMobileNav.module.css";
const items = [
  { href: "/medicines", label: "Medicines", Icon: Pill },
  { href: "/prescription", label: "Prescription", Icon: FileUp },
  { href: "/refill", label: "Refills", Icon: RotateCw },
  { href: "/services", label: "Services", Icon: HeartPulse },
  { href: "/portal", label: "My care", Icon: UserRound },
];
export default function CareMobileNav() {
  const path = usePathname() || "/";
  const [visible, setVisible] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let footerNear = false;
    let formControlFocused = false;

    const isFormControl = () => {
      const active = document.activeElement as HTMLElement | null;
      return Boolean(
        active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.tagName === "SELECT" ||
            active.isContentEditable),
      );
    };

    const canShow = () => window.scrollY > 96 && !footerNear && !formControlFocused;

    const sync = () => setVisible(canShow());

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      lastScrollY.current = currentY;

      if (!canShow()) {
        setVisible(false);
      } else if (delta < -5) {
        setVisible(true);
      } else if (delta > 9) {
        setVisible(false);
      }
    };

    const onFocusIn = () => {
      formControlFocused = isFormControl();
      sync();
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        formControlFocused = isFormControl();
        sync();
      }, 0);
    };

    const footer = document.getElementById("site-footer");
    const observer = footer
      ? new IntersectionObserver(
          ([entry]) => {
            footerNear = Boolean(entry?.isIntersecting);
            sync();
          },
          { rootMargin: "0px 0px 96px 0px", threshold: 0 },
        )
      : null;

    if (footer) observer?.observe(footer);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    lastScrollY.current = window.scrollY;
    sync();

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [path]);

  return (
    <nav
      className={styles.nav}
      data-visible={visible ? "true" : "false"}
      aria-label="Your care shortcuts"
      aria-hidden={!visible}
    >
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          tabIndex={visible ? undefined : -1}
          aria-current={
            path === href || path.startsWith(`${href}/`) ? "page" : undefined
          }
        >
          <Icon size={19} aria-hidden />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
