import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateTemplateAction } from "@/app/actions/admin";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";
import TemplateForm from "@/app/components/admin/TemplateForm";

export const metadata = { title: "Templates" };

export default async function AdminTemplatesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const templates = await prisma.messageTemplate.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <AdminShell user={user} title="Message templates">
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Create template">
          <TemplateForm action={adminCreateTemplateAction} />
        </AdminPanel>
        <AdminPanel title="Library">
          <ul className="space-y-3">
            {templates.map((t) => (
              <li key={t.id} className="rounded-xl border border-white/10 p-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-teal-100/50">
                  {t.channel} · {t.category}
                </p>
                {t.subject && <p className="mt-1 text-sm text-teal-100/70">{t.subject}</p>}
                <p className="mt-1 text-sm text-teal-50/80">{t.body}</p>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
