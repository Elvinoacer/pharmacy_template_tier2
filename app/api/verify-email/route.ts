import { redirect } from "next/navigation";
import { verifyEmailWithToken, writeAuditLog } from "@/app/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const ok = token ? await verifyEmailWithToken(token) : false;
  if (ok) {
    await writeAuditLog(null, "email_verified", "user");
    redirect("/portal/profile?verified=1");
  }
  redirect("/login?verified=0");
}
