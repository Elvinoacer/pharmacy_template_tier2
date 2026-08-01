import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Honeypot — silently accept bots
    if (body.company) {
      return NextResponse.json({ ok: true });
    }

    const { name, phone, email, subject, message } = body;
    if (!name || !phone || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Tier 1 demo: log submission (swap for email / CMS / dashboard later)
    console.log("[contact]", {
      name,
      phone,
      email,
      subject,
      message,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
