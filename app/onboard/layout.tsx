import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

export default function OnboardLayout({ children }: { children: ReactNode }) {
  return <div className={`${styles.page} ${styles.onboardPage} aether-artwork-surface`}>
    <nav className={styles.joinNav} aria-label="Pharmacy onboarding">
      <Link href="/for-pharmacies"><ArrowLeft size={16} aria-hidden /><strong>Aether</strong><span>for pharmacies</span></Link>
      <span><ShieldCheck size={15} aria-hidden /> Secure application</span>
    </nav>
    <main>{children}</main>
  </div>;
}
