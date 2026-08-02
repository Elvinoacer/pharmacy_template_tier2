import type { NextRequest } from "next/server";
import { processDueReminders } from "@/app/lib/services/crm";
import { writeAuditLog } from "@/app/lib/auth";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await processDueReminders();
  await writeAuditLog(null, "cron_reminders_processed", "reminder", undefined, { count });
  return Response.json({ processed: count });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

