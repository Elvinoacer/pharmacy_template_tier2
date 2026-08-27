import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { logPrescriberRefillAuthorization } from "@/app/lib/services/refills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const prescriptionId = String(body.prescriptionId || "");
    const contactMethod = String(body.contactMethod || "phone");
    const contactedTo = String(body.contactedTo || "").trim();
    const inquiryDetails = String(body.inquiryDetails || "").trim();
    const doctorResponse = body.doctorResponse ? String(body.doctorResponse).trim() : undefined;
    const resolved = body.resolved === true;

    if (!prescriptionId || !contactedTo || !inquiryDetails) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const log = await logPrescriberRefillAuthorization({
      prescriptionId,
      contactMethod,
      contactedTo,
      inquiryDetails,
      doctorResponse,
      resolved,
      actorId: user.id,
    });

    return NextResponse.json({ ok: true, data: log });
  } catch (err) {
    return NextResponse.json(
      { error: "prescriber_contact_failed", message: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}
