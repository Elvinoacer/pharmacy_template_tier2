import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminKnowledgeAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import KnowledgeForm from "@/app/components/admin/KnowledgeForm";
import { BookOpen, Brain, FolderTree, CheckCircle2, FileText, Star } from "lucide-react";

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
      title="AI knowledge base"
      subtitle="The virtual assistant answers only from approved articles plus Tier 1 pharmacy facts."
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Total articles</p>
            <FileText className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{stats.total}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Approved</p>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.approved}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Drafts</p>
            <FileText className="h-3.5 w-3.5 text-amber-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{stats.drafts}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Categories</p>
            <FolderTree className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{stats.categories}</p>
        </div>
      </div>

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--admin-accent)]/20 bg-[var(--admin-accent)]/[0.04] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text">
          <Brain className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold admin-text">How AI knowledge works</p>
          <p className="mt-0.5 text-xs admin-muted">
            The virtual assistant searches approved articles first, then falls back to general pharmacy
            knowledge. Mark articles as approved to make them available to the assistant.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Add / edit article" description="Create a new knowledge article">
          <KnowledgeForm action={adminKnowledgeAction} />
        </AdminPanel>

        <AdminPanel
          title="Knowledge library"
          description={`${articles.length} article${articles.length === 1 ? "" : "s"}`}
        >
          {articles.length === 0 ? (
            <AdminEmptyState icon={BookOpen} title="No articles yet" description="Add your first article using the form on the left." />
          ) : (
            <ul className="space-y-2">
              {articles.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5 transition hover:border-[var(--admin-border-2)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold admin-text">{a.title}</p>
                        {a.isApproved ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-2.5 w-2.5" /> approved
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            draft
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs admin-muted">
                        <FolderTree className="mr-1 inline h-2.5 w-2.5" />
                        {a.category}
                        {a.priority > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5" /> p{a.priority}
                          </span>
                        )}
                      </p>
                      <p className="mt-1.5 line-clamp-3 text-sm admin-text/75">{a.content}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
