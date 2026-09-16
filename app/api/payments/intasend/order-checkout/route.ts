import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "unsupported_payment_method",
      message:
        "Customer orders cannot be processed via IntaSend. All customer commerce payments must use the pharmacy's direct Safaricom Daraja M-Pesa account.",
    },
    { status: 400 },
  );
}
