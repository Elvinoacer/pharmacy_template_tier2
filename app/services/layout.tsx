import type { ReactNode } from "react";
import styles from "./ServicesRouteSurface.module.css";

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return <div className={`${styles.surface} afyvia-route-surface`}>{children}</div>;
}
