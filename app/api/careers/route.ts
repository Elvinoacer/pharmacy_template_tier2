import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.company) {
      return NextResponse.json({ ok: true });
    }

    const { name, email, phone, role } = body;
    if (!name || !email || !phone || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("[careers]", { ...body, at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
