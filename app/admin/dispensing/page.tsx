import { redirect } from "next/navigation";
import { getSessionUser, requireStaff } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { getDispensingRegister } from "@/app/lib/services/dispensing";
import { DispensingRegisterTable } from "@/app/components/admin/DispensingRegisterTable";

export const metadata = {
  title: "Dispensing Register & Regulatory Ledger",
};

export default async function AdminDispensingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    startDate?: string;
    endDate?: string;
    controlledOnly?: string;
    substitutionsOnly?: string;
  }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  requireStaff(user);

  const sp = await searchParams;
  const page = Number(sp.page || 1);
  const pageSize = 25;

  const data = await getDispensingRegister({
    page,
    pageSize,
    q: sp.q,
    startDate: sp.startDate,
    endDate: sp.endDate,
    controlledOnly: sp.controlledOnly === "true",
    substitutionsOnly: sp.substitutionsOnly === "true",
  });

  return (
    <AdminShell
      user={user}
      title="Dispensing register"
      subtitle="Find completed fills, sales, and substitutions in one searchable record."
    >
      <DispensingRegisterTable
        initialRecords={data.records}
        metrics={data.metrics}
        total={data.total}
        initialPage={data.page}
        pageSize={pageSize}
      />
    </AdminShell>
  );
}
