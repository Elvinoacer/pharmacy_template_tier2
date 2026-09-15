import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requirePlatformAdmin } from "@/app/lib/auth";
import { mergeDuplicateMedications } from "@/app/lib/services/platform-medication-library";

export const runtime = "nodejs";

const Body = z.object({
  survivorId: z.string().uuid(),
  duplicateId: z.string().uuid(),
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
    return NextResponse.json({ error: "invalid_request", message: "Invalid survivor or duplicate ID." }, { status: 400 });
  }

  try {
    const result = await mergeDuplicateMedications({
      survivorId: body.survivorId,
      duplicateId: body.duplicateId,
      reason: body.reason,
      actorId: user.id,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[mergeDuplicateMedications POST]", err);
    return NextResponse.json({ error: "merge_failed", message: err.message || "Failed to merge medications." }, { status: 500 });
  }
}
