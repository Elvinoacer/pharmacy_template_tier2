import type { ReactNode } from "react";
import PublicFlowSurface from "@/app/components/PublicFlowSurface";

export default function OrderLayout({ children }: { children: ReactNode }) {
  return <PublicFlowSurface variant="order">{children}</PublicFlowSurface>;
}
