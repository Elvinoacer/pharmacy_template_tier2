import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateTemplateAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { PremiumFeatureNotice } from "@/app/components/admin/PremiumFeatureNotice";
import TemplateForm from "@/app/components/admin/TemplateForm";
import { FileText, Mail, MessageSquare, MessageCircle, Layout, FolderTree } from "lucide-react";
import styles from "./templates.module.css";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";

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

  const pharmacyId =
    user.activePharmacyId ||
    user.memberships.find((membership) => membership.status === "active")?.pharmacyId;
  if (!pharmacyId) redirect("/admin/select");
  const premiumActive = await hasPremiumPlan(pharmacyId);

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
      <div className={styles.page}>
        {!premiumActive && (
          <div className="mb-5">
            <PremiumFeatureNotice
              title="Standardise communication at scale"
              description="Existing templates stay readable on Free. Premium lets the pharmacy create and maintain reusable templates for recurring email, SMS, WhatsApp and portal communication."
              benefits={["Reusable templates", "Consistent staff messaging", "Faster outreach"]}
            />
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-6 sm:grid-cols-5 sm:gap-3">
          <div className="admin-stat p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Total</p>
              <FileText className="h-3.5 w-3.5 admin-accent-text" />
            </div>
            <p className="mt-1 text-2xl font-bold admin-text">{templates.length}</p>
          </div>
          {["email", "sms", "whatsapp", "portal"].map((ch) => {
            const Icon = CHANNEL_ICON[ch] || FileText;
            return (
              <div key={ch} className="admin-stat p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold uppercase tracking-wide admin-muted">{ch}</p>
                  <Icon className="h-3.5 w-3.5 shrink-0 admin-accent-text" />
                </div>
                <p className="mt-1 text-2xl font-bold admin-text">{byChannel[ch] || 0}</p>
              </div>
            );
          })}
        </div>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-6">
          <AdminPanel
            title={premiumActive ? "Create / manage template" : "Custom template studio"}
            description={premiumActive ? "Draft, edit, personalise, and save reusable communication copy." : "Preview the reusable communication layer available on Premium."}
            className={styles.editorPanel}
          >
            {premiumActive ? (
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
            ) : (
              <PremiumFeatureNotice
                compact
                title="Write once, reuse across the team"
                description="Premium unlocks custom reusable messages and prepares the communication layer for campaigns and automated follow-up."
              />
            )}
          </AdminPanel>

          <AdminPanel
            title="Template library"
            description={`${templates.length} template${templates.length === 1 ? "" : "s"} ready for staff workflows`}
            className={styles.libraryPanel}
          >
            {templates.length === 0 ? (
              <AdminEmptyState
                icon={FileText}
                title="No templates yet"
                description="Create your first template to standardise recurring customer communication."
              />
            ) : (
              <ul className="space-y-2.5">
                {templates.map((t) => {
                  const Icon = CHANNEL_ICON[t.channel] || FileText;
                  return (
                    <li
                      key={t.id}
                      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-semibold admin-text">{t.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs admin-muted">
                            <span className="capitalize">{t.channel}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <FolderTree className="h-3 w-3 shrink-0" />
                              <span className="truncate">{t.category}</span>
                            </span>
                          </div>
                          {t.subject && (
                            <p className="mt-2 break-words text-sm font-medium admin-text">{t.subject}</p>
                          )}
                          <p className="mt-1.5 line-clamp-3 break-words text-xs leading-5 admin-muted">{t.body}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminPanel>
        </div>
      </div>
    </AdminShell>
  );
}
