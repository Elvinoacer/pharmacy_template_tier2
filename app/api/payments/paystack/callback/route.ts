import { NextResponse } from "next/server";

import { verifyAndProcessPaystackReference } from "@/app/lib/services/paystack-billing";
import { processPaystackRetryReference } from "@/app/lib/services/paystack-dunning";
import { withPlatformBypass } from "@/app/lib/tenant-context";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = String(url.searchParams.get("reference") || "").trim();
  const destination = new URL("/onboard/billing", req.url);

  if (!reference) {
    destination.searchParams.set("payment", "missing-reference");
    return NextResponse.redirect(destination);
  }

  try {
    const result = await withPlatformBypass(async () => {
      const retry = await processPaystackRetryReference(reference);
      if (retry.handled) return { ok: retry.ok, note: retry.note };
      return verifyAndProcessPaystackReference(reference);
    });
    destination.searchParams.set("payment", result.ok ? result.note : "confirming");
  } catch (error) {
    console.error("[paystack callback]", error);
    destination.searchParams.set("payment", "confirming");
  }
  return NextResponse.redirect(destination);
}
