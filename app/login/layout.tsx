import type { ReactNode } from "react";
import PublicFlowSurface from "@/app/components/PublicFlowSurface";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <PublicFlowSurface variant="login">{children}</PublicFlowSurface>;
}
