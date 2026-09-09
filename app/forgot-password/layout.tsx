import type { ReactNode } from "react";
import PublicFlowSurface from "@/app/components/PublicFlowSurface";

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return <PublicFlowSurface variant="forgot-password">{children}</PublicFlowSurface>;
}
