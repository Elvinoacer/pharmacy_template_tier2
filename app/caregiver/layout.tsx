import type { ReactNode } from "react";
import styles from "./CaregiverSurface.module.css";

export default function CaregiverLayout({ children }: { children: ReactNode }) {
  return <div className={styles.surface}>{children}</div>;
}
