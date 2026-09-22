import type { ReactNode } from "react";
import PublicFlowSurface from "@/app/components/PublicFlowSurface";

export default function CaregiverAcceptLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PublicFlowSurface variant="caregiver-accept">
      <div className="flex min-h-[100dvh] w-full items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 [&_a]:min-h-11 [&_a]:w-full [&_a]:items-center [&_a]:justify-center [&_a]:text-sm [&_button]:min-h-11 [&_button]:text-sm [&_form]:w-full [&_h1]:text-2xl [&_input]:min-h-11 [&_label]:!text-sm [&_main]:!min-h-0 [&_main]:!w-full [&_main]:!max-w-2xl [&_main]:!bg-transparent [&_main]:!px-0 [&_main]:!py-0 [&_p]:text-sm [&_section]:!w-full [&_section]:!max-w-lg [&_section]:!p-5 [&_select]:min-h-11 [&_textarea]:min-h-11 sm:[&_a]:w-auto sm:[&_h1]:text-[1.75rem] sm:[&_p]:text-[15px] sm:[&_section]:!p-7 lg:[&_h1]:text-3xl lg:[&_p]:text-base lg:[&_section]:!p-8">
        {children}
      </div>
    </PublicFlowSurface>
  );
}
