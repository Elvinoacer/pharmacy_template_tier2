import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminFeedbackRespondAction } from "@/app/actions/admin";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";
import FeedbackRespondForm from "@/app/components/admin/FeedbackRespondForm";

export const metadata = { title: "Feedback" };

export default async function AdminFeedbackPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const items = await prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <AdminShell user={user} title="Customer feedback">
      <div className="space-y-4">
        {items.map((f) => (
          <AdminPanel key={f.id} title={`${f.type}${f.rating ? ` · ${f.rating}/5` : ""}`}>
            <p className="text-sm font-medium">{f.title || f.name || "Anonymous"}</p>
            <p className="mt-1 text-sm text-teal-100/80">{f.body}</p>
            <p className="mt-1 text-xs text-teal-100/40">
              {f.status} · {new Date(f.createdAt).toLocaleString()}
            </p>
            {f.staffResponse && (
              <p className="mt-3 rounded-xl bg-teal-500/10 px-3 py-2 text-sm text-teal-100">
                Response: {f.staffResponse}
              </p>
            )}
            {f.status !== "responded" && (
              <div className="mt-3">
                <FeedbackRespondForm action={adminFeedbackRespondAction} id={f.id} />
              </div>
            )}
          </AdminPanel>
        ))}
      </div>
    </AdminShell>
  );
}
