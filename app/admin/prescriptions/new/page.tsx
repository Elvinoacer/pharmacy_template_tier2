import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { adminCreatePrescriptionAction } from "@/app/actions/admin";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import PrescriptionForm from "@/app/components/admin/PrescriptionForm";

export const metadata = { title: "New prescription" };

export default async function NewPrescriptionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell
      user={user}
      title="New prescription"
      subtitle="Add a prescription to a customer's file"
    >
      <div className="max-w-2xl">
        <AdminPanel>
          <PrescriptionForm action={adminCreatePrescriptionAction} />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
