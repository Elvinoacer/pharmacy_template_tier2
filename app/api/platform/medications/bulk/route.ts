import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requirePlatformAdmin } from "@/app/lib/auth";
import { bulkUpdateMedicationStatus } from "@/app/lib/services/platform-medication-library";

export const runtime = "nodejs";

const Body = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(["active", "needs_review", "deprecated", "archived"]),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.platformAdmin) {
    return NextResponse.json({ error: "forbidden", message: "Platform admin access required." }, { status: 403 });
  }

  try {
    requirePlatformAdmin(user);
  } catch (err: any) {
    return NextResponse.json({ error: "unauthorized", message: err.message }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid_request", message: "Invalid ids or status provided." }, { status: 400 });
  }

  try {
    const result = await bulkUpdateMedicationStatus({
      ids: body.ids,
      status: body.status,
      reason: body.reason,
      actorId: user.id,
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (err) {
    console.error("[bulkUpdateMedicationStatus POST]", err);
    return NextResponse.json({ error: "update_failed", message: "Failed to update medications." }, { status: 500 });
  }
}
