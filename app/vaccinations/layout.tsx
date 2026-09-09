import type { ReactNode } from "react";
import styles from "../PublicHealthRouteSurface.module.css";

export default function VaccinationsLayout({ children }: { children: ReactNode }) {
  return <div className={`${styles.surface} ${styles.vaccinationSurface}`}>{children}</div>;
}
