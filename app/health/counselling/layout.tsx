import type { ReactNode } from "react";
import styles from "@/app/components/health/HealthAdaptiveSurface.module.css";

export default function CounsellingLayout({ children }: { children: ReactNode }) {
  return <div className={styles.surface}>{children}</div>;
}
