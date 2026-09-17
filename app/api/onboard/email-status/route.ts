import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getSessionUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ authenticated: false, verified: false }, { status: 401 });
    }

    const current = await prismaUnscoped.user.findUnique({
      where: { id: user.id },
      select: { email: true, emailVerified: true },
    });

    return NextResponse.json({
      authenticated: true,
      verified: Boolean(current?.emailVerified),
      email: current?.email ?? user.email,
    });
  } catch (error) {
    console.error("[api/onboard/email-status] check failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
