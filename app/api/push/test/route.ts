import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { dispatchPushToUser } from "@/app/lib/services/push";

export const runtime = "nodejs";

/// Sends a test push to the calling user's devices. Used by the "Send test
/// notification" button in the portal/admin notification centre.
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const result = await dispatchPushToUser(user.id, {
    title: "Test notification",
    body: "If you can read this, push notifications are wired up correctly.",
    url: typeof window === "undefined" ? "/portal" : "/portal",
    data: { tag: "test-push" },
  });

  return NextResponse.json(result);
}
