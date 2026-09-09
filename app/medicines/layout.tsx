import type { ReactNode } from "react";
import styles from "./MedicinesRouteSurface.module.css";

export default function MedicinesLayout({ children }: { children: ReactNode }) {
  return <div className={styles.surface}>{children}</div>;
}
