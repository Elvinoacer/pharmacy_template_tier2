import type { ReactNode } from "react";
import PublicFlowSurface from "@/app/components/PublicFlowSurface";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <PublicFlowSurface variant="storefront">{children}</PublicFlowSurface>;
}
