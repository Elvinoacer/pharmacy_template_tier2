import type { ReactNode } from "react";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

export default function OnboardLayout({ children }: { children: ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}
