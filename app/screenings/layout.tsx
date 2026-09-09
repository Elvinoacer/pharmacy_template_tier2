import type { ReactNode } from "react";
import styles from "@/app/components/health/HealthAdaptiveSurface.module.css";

export default function ScreeningsLayout({ children }: { children: ReactNode }) {
  return <div className={styles.surface}>{children}</div>;
}
