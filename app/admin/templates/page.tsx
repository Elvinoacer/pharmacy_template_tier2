import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateTemplateAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import TemplateForm from "@/app/components/admin/TemplateForm";
import { FileText, Mail, MessageSquare, MessageCircle, Layout, FolderTree } from "lucide-react";

export const metadata = { title: "Templates" };

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  portal: Layout,
  ai: MessageSquare,
};

export default async function AdminTemplatesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const templates = await prisma.messageTemplate.findMany({ orderBy: { createdAt: "desc" } });

  const byChannel = templates.reduce<Record<string, number>>((acc, t) => {
    acc[t.channel] = (acc[t.channel] || 0) + 1;
    return acc;
  }, {});

  return (
    <AdminShell
      user={user}
      title="Message templates"
      subtitle="Create reusable messages for email, SMS, WhatsApp, and the portal."
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="admin-stat p-4">
          <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Total</p>
          <p className="mt-1 text-2xl font-bold admin-text">{templates.length}</p>
        </div>
        {["email", "sms", "whatsapp", "portal"].map((ch) => {
          const Icon = CHANNEL_ICON[ch] || FileText;
          return (
            <div key={ch} className="admin-stat p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide admin-muted">{ch}</p>
                <Icon className="h-3 w-3 admin-accent-text" />
              </div>
              <p className="mt-1 text-2xl font-bold admin-text">{byChannel[ch] || 0}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Create / manage template" description="Add or edit a reusable message template">
          <TemplateForm
            action={adminCreateTemplateAction}
            templates={templates.map((t) => ({
              id: t.id,
              name: t.name,
              channel: t.channel,
              subject: t.subject,
              body: t.body,
              category: t.category,
            }))}
          />
        </AdminPanel>

        <AdminPanel
          title="Library"
          description={`${templates.length} template${templates.length === 1 ? "" : "s"}`}
        >
          {templates.length === 0 ? (
            <AdminEmptyState icon={FileText} title="No templates yet" description="Create your first template using the form on the left." />
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => {
                const Icon = CHANNEL_ICON[t.channel] || FileText;
                return (
                  <li
                    key={t.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5 transition hover:border-[var(--admin-border-2)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] admin-accent-text">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold admin-text">{t.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs admin-muted">
                          <span className="capitalize">{t.channel}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <FolderTree className="h-2.5 w-2.5" /> {t.category}
                          </span>
                        </div>
                        {t.subject && (
                          <p className="mt-1.5 text-sm font-medium admin-text">{t.subject}</p>
                        )}
                        <p className="mt-1 line-clamp-2 text-xs admin-muted">{t.body}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
