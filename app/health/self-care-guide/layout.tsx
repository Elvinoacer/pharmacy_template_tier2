import type { ReactNode } from "react";
import healthStyles from "../HealthSurface.module.css";
import styles from "./SelfCareGuideSurface.module.css";

export default function SelfCareGuideLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${healthStyles.healthSurface} ${styles.surface}`}>
      {children}
    </div>
  );
}
