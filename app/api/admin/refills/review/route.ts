import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { getRefillRequestReviewDetails } from "@/app/lib/services/refills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  try {
    const details = await getRefillRequestReviewDetails(id);
    if (!details) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: details });
  } catch (err) {
    console.error("[api/admin/refills/review]", err);
    return NextResponse.json(
      { error: "failed_to_load_review_details", message: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}
