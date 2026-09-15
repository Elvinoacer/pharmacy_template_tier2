import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requirePlatformAdmin } from "@/app/lib/auth";
import {
  previewPlatformMedicationImport,
  executePlatformMedicationImport,
} from "@/app/lib/services/platform-csv-importer";

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum(["preview", "execute"]),
  csvContent: z.string().min(1),
  filename: z.string().optional(),
  transactional: z.boolean().optional().default(false),
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
    return NextResponse.json({ error: "invalid_request", message: "CSV content is required." }, { status: 400 });
  }

  try {
    if (body.action === "preview") {
      const preview = await previewPlatformMedicationImport(body.csvContent);
      return NextResponse.json({ ok: true, preview });
    } else {
      const result = await executePlatformMedicationImport({
        csvContent: body.csvContent,
        filename: body.filename,
        actorId: user.id,
        transactional: body.transactional,
      });
      return NextResponse.json({ ok: true, result });
    }
  } catch (err: any) {
    console.error("[platform medication import POST]", err);
    return NextResponse.json({ error: "import_failed", message: err.message || "Failed to process CSV import." }, { status: 500 });
  }
}
