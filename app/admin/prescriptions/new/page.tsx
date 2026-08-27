import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { adminCreatePrescriptionAction } from "@/app/actions/admin";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import PrescriptionForm from "@/app/components/admin/PrescriptionForm";
import { PROJECT_TIMEZONE } from "@/app/lib/time";

export const metadata = { title: "New prescription" };

export default async function NewPrescriptionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell
      user={user}
      title="New prescription"
      subtitle={`Add one or more drugs to a customer file · times in ${PROJECT_TIMEZONE.replace(/_/g, " ")}`}
    >
      <AdminPanel
        title="Prescription details"
        description="Required fields are marked. Optional fields can be filled later."
      >
        <PrescriptionForm action={adminCreatePrescriptionAction} />
      </AdminPanel>
    </AdminShell>
  );
}
