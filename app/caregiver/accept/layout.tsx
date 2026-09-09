import type { ReactNode } from "react";
import PublicFlowSurface from "@/app/components/PublicFlowSurface";

export default function CaregiverAcceptLayout({ children }: { children: ReactNode }) {
  return <PublicFlowSurface variant="caregiver-accept">{children}</PublicFlowSurface>;
}
