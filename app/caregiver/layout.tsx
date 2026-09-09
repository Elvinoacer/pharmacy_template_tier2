import type { ReactNode } from "react";
import styles from "./CaregiverSurface.module.css";
import "./caregiver-responsive.css";

export default function CaregiverLayout({ children }: { children: ReactNode }) {
  return <div className={`${styles.surface} caregiver-surface`}>{children}</div>;
}
