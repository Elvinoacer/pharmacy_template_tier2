import type { ReactNode } from "react";
import PublicFlowSurface from "@/app/components/PublicFlowSurface";

export default function RefillStatusLayout({ children }: { children: ReactNode }) {
  return <PublicFlowSurface variant="refill-status">{children}</PublicFlowSurface>;
}
