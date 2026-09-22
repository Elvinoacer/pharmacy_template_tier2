"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

function resolveAdminUxPage(pathname: string):
  | "orders"
  | "prescriptions"
  | "prescription-detail"
  | "prescription-new"
  | "refills"
  | undefined {
  if (pathname === "/admin/orders") return "orders";
  if (pathname === "/admin/prescriptions/new") return "prescription-new";
  if (pathname === "/admin/prescriptions") return "prescriptions";
  if (pathname.startsWith("/admin/prescriptions/")) return "prescription-detail";
  if (pathname === "/admin/refills") return "refills";
  return undefined;
}

export function AdminRouteUxBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const page = resolveAdminUxPage(pathname);

  return (
    <div className="admin-route-ux w-full min-w-0 max-w-full overflow-x-clip" data-admin-ux-page={page}>
      {children}
    </div>
  );
}
