import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

const Body = z.object({
  token: z.string().min(10),
  label: z.string().max(120).optional(),
});

/// Called by the browser after `getToken()` resolves. We upsert the FCM token
/// against the current user so we can fan pushes out to all their devices.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid_body", details: String(err) }, { status: 400 });
  }

  // Determine a friendly label from user-agent if none supplied.
  const ua = req.headers.get("user-agent") || "";
  const label =
    parsed.label ||
    (ua.includes("iPhone") || ua.includes("iPad")
      ? "iOS Safari"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("Mac")
          ? "Mac Browser"
          : ua.includes("Windows")
            ? "Windows Browser"
            : "Browser");

  await prisma.pushDevice.upsert({
    where: { token: parsed.token },
    create: { token: parsed.token, userId: user.id, label },
    update: { userId: user.id, label, lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
