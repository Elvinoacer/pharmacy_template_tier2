import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { adminCreateMedicationAction } from "@/app/actions/admin";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import MedicationForm from "@/app/components/admin/MedicationForm";

export const metadata = { title: "New medication" };

export default async function NewMedicationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell user={user} title="New medication" subtitle="Add a drug to the catalog">
      <div className="max-w-2xl">
        <AdminPanel>
          <MedicationForm action={adminCreateMedicationAction} />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
