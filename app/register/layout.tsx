import type { ReactNode } from "react";
import PublicFlowSurface from "@/app/components/PublicFlowSurface";

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <PublicFlowSurface variant="register">{children}</PublicFlowSurface>;
}
