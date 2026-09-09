import type { ReactNode } from "react";
import styles from "./PublicFlowSurface.module.css";

type PublicFlowVariant =
  | "refill-status"
  | "order"
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "caregiver-accept"
  | "storefront";

export default function PublicFlowSurface({
  children,
  variant,
}: {
  children: ReactNode;
  variant: PublicFlowVariant;
}) {
  return (
    <div className={styles.surface} data-flow={variant}>
      {children}
    </div>
  );
}
