import { NextResponse } from "next/server";
import { createEnquiry } from "@/app/lib/services/crm";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.company) {
      return NextResponse.json({ ok: true });
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const role = String(body.role || "").trim();

    if (!name || !email || !phone || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await createEnquiry({
      name,
      email,
      phone,
      type: "careers",
      subject: `Career application — ${role}`,
      message: [
        `Role: ${role}`,
        body.message ? `Cover note: ${body.message}` : null,
        body.experience ? `Experience: ${body.experience}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      source: "website",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[careers]", err);
    return NextResponse.json({ error: "Could not submit application" }, { status: 500 });
  }
}
