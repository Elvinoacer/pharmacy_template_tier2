"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const path = usePathname();
  return (
    <nav className={styles.nav} aria-label="Your care shortcuts">
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
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
