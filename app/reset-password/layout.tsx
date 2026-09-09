import type { ReactNode } from "react";
import PublicFlowSurface from "@/app/components/PublicFlowSurface";

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return <PublicFlowSurface variant="reset-password">{children}</PublicFlowSurface>;
}
