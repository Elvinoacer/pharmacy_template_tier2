import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminKnowledgeAction } from "@/app/actions/admin";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";
import KnowledgeForm from "@/app/components/admin/KnowledgeForm";

export const metadata = { title: "AI Knowledge" };

export default async function AdminKnowledgePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const articles = await prisma.knowledgeArticle.findMany({
    orderBy: [{ priority: "desc" }, { title: "asc" }],
  });

  return (
    <AdminShell user={user} title="AI knowledge base">
      <p className="mb-4 text-sm text-teal-100/50">
        The virtual assistant answers only from approved articles plus Tier 1 pharmacy facts.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Add article">
          <KnowledgeForm action={adminKnowledgeAction} />
        </AdminPanel>
        <AdminPanel title="Approved knowledge">
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.id} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{a.title}</p>
                  <span className="text-[10px] uppercase text-teal-100/40">
                    {a.isApproved ? "approved" : "draft"} · p{a.priority}
                  </span>
                </div>
                <p className="mt-1 text-xs text-teal-100/50">{a.category}</p>
                <p className="mt-2 text-sm text-teal-50/80 line-clamp-3">{a.content}</p>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
