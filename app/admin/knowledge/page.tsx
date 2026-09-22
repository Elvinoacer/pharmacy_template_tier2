import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminKnowledgeAction } from "@/app/actions/admin";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import KnowledgeForm from "@/app/components/admin/KnowledgeForm";
import { Brain, CheckCircle2, FileText, FolderTree, ShieldCheck } from "lucide-react";

export const metadata = { title: "AI Knowledge" };

export default async function AdminKnowledgePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const articles = await prisma.knowledgeArticle.findMany({
    orderBy: [{ priority: "desc" }, { title: "asc" }],
  });

  const stats = {
    total: articles.length,
    approved: articles.filter((a) => a.isApproved).length,
    drafts: articles.filter((a) => !a.isApproved).length,
    categories: new Set(articles.map((a) => a.category)).size,
  };

  return (
    <AdminShell
      user={user}
      title="Assistant knowledge"
      subtitle="Curate the approved information the assistant may use when answering customer questions."
    >
      <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="admin-stat min-w-0 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold uppercase tracking-wide admin-muted">Articles</p>
              <FileText className="h-3.5 w-3.5 shrink-0 admin-accent-text" />
            </div>
            <p className="mt-1 text-xl font-black tabular-nums admin-text sm:text-2xl">{stats.total}</p>
          </div>
          <div className="admin-stat min-w-0 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold uppercase tracking-wide admin-muted">Approved</p>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            </div>
            <p className="mt-1 text-xl font-black tabular-nums text-emerald-700 dark:text-emerald-300 sm:text-2xl">{stats.approved}</p>
          </div>
          <div className="admin-stat min-w-0 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold uppercase tracking-wide admin-muted">Drafts</p>
              <FileText className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
            </div>
            <p className="mt-1 text-xl font-black tabular-nums text-amber-700 dark:text-amber-300 sm:text-2xl">{stats.drafts}</p>
          </div>
          <div className="admin-stat min-w-0 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold uppercase tracking-wide admin-muted">Categories</p>
              <FolderTree className="h-3.5 w-3.5 shrink-0 admin-accent-text" />
            </div>
            <p className="mt-1 text-xl font-black tabular-nums admin-text sm:text-2xl">{stats.categories}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)] lg:items-start">
          <AdminPanel
            title="Knowledge workspace"
            description="Create new guidance or select an existing article below the form to edit it."
          >
            <KnowledgeForm
              action={adminKnowledgeAction}
              articles={articles.map((a) => ({
                id: a.id,
                title: a.title,
                category: a.category,
                content: a.content,
                priority: a.priority,
                isApproved: a.isApproved,
              }))}
            />
          </AdminPanel>

          <aside className="space-y-3 lg:sticky lg:top-4">
            <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text">
                  <Brain className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold admin-text">What reaches the assistant?</p>
                  <p className="mt-1 text-sm leading-6 admin-muted">
                    Only approved articles relevant to the customer&apos;s question are retrieved. The complete knowledge library is never dumped into the model context.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Approval is the publishing gate</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800/80 dark:text-emerald-200/80">
                    Keep uncertain or unfinished material as a draft. Approve it only when the wording is safe and ready to support customer-facing answers.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
