import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.website) {
      return NextResponse.json({ ok: true });
    }

    const { fullName, phone, medicine, pickupDate } = body;
    if (!fullName || !phone || !medicine || !pickupDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("[refill]", { ...body, at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
