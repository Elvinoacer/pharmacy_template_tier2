import type { ReactNode } from "react";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

export default function OnboardTemplate({ children }: { children: ReactNode }) {
  return <div className={styles.routeEnter}>{children}</div>;
}
