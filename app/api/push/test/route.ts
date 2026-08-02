import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { dispatchPushToUser } from "@/app/lib/services/push";

export const runtime = "nodejs";

/// Sends a test push to the calling user's devices. Used by the "Send test
/// notification" button in the portal/admin notification centre.
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const home = isStaff(user.role) ? "/admin/notifications" : "/portal/messages";

  const result = await dispatchPushToUser(user.id, {
    title: "Test notification",
    body: isStaff(user.role)
      ? "Staff push is working — you will get alerts for refills, enquiries, and escalations."
      : "Customer push is working — you will get refill updates and pharmacy messages.",
    url: home,
    data: { tag: "test-push" },
  });

  return NextResponse.json(result);
}
