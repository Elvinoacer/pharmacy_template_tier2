import { NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { requirePlatformRole } from "@/app/lib/platform/policy";
import { readExportArchive } from "@/app/lib/platform/data-lifecycle";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  try {
    requirePlatformRole(user, ["owner", "super_admin", "auditor"]);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  const token = request.nextUrl.searchParams.get("token");
  if (!id || !token) return new Response("Missing id or token", { status: 400 });

  const row = await readExportArchive(id, token);
  if (!row?.archiveUrl) return new Response("Not found or expired", { status: 404 });

  const base64 = row.archiveUrl.replace(/^data:application\/json;base64,/, "");
  const buf = Buffer.from(base64, "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="export-${id.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
