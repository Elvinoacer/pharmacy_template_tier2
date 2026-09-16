import { NextResponse } from "next/server";
import { completeIntasendBillingPayment } from "@/app/lib/platform/billing";
import { completeIntasendOrderPayment } from "@/app/lib/services/payments";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const apiRef = searchParams.get("api_ref") || "";
  const amount = searchParams.get("amount") || "0";
  const redirectUrl = searchParams.get("redirect_url") || "/";
  const invoiceId = searchParams.get("invoice_id") || `mock_${Date.now()}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IntaSend Secure Checkout (Simulation)</title>
  <style>
    :root {
      --primary: #0d6e5a;
      --primary-hover: #084c3f;
      --bg: #f7faf8;
      --card: #ffffff;
      --border: #e2e8e4;
      --text: #1a2e26;
      --muted: #64748b;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      width: 100%;
      max-width: 440px;
      padding: 32px;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #e6f4ef;
      color: var(--primary);
      font-weight: 600;
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 16px;
    }
    .amount {
      font-size: 36px;
      font-weight: 700;
      color: var(--text);
      margin: 8px 0;
    }
    .reference {
      font-family: monospace;
      font-size: 12px;
      color: var(--muted);
      background: #f1f5f9;
      padding: 6px 10px;
      border-radius: 8px;
      display: inline-block;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .methods {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .method-pill {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #fafafa;
    }
    .btn-pay {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 12px;
      padding: 14px 24px;
      font-size: 15px;
      font-weight: 600;
      width: 100%;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-pay:hover {
      background: var(--primary-hover);
    }
    .btn-cancel {
      background: transparent;
      color: var(--muted);
      border: none;
      margin-top: 12px;
      font-size: 13px;
      cursor: pointer;
      text-decoration: underline;
    }
    .note {
      font-size: 11px;
      color: var(--muted);
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🔒 IntaSend Secure Payment</div>
    <div class="amount">KES ${amount}</div>
    <div class="reference">Ref: ${apiRef}</div>

    <div class="methods">
      <div class="method-pill">🟢 M-PESA</div>
      <div class="method-pill">💳 Card</div>
      <div class="method-pill">🏦 Bank</div>
    </div>

    <form method="POST" action="/api/payments/intasend/mock-checkout">
      <input type="hidden" name="api_ref" value="${apiRef}" />
      <input type="hidden" name="amount" value="${amount}" />
      <input type="hidden" name="invoice_id" value="${invoiceId}" />
      <input type="hidden" name="redirect_url" value="${redirectUrl}" />
      <button type="submit" class="btn-pay">Pay KES ${amount} (Simulate IntaSend)</button>
    </form>

    <button onclick="window.location.href='${redirectUrl}'" class="btn-cancel">Cancel and return</button>
    <div class="note">IntaSend Development Sandbox Environment. No real funds are debited.</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const apiRef = String(formData.get("api_ref") || "");
  const amount = Number(formData.get("amount") || 0);
  const redirectUrl = String(formData.get("redirect_url") || "/");
  const invoiceId = String(formData.get("invoice_id") || `mock_${Date.now()}`);

  try {
    if (apiRef.startsWith("SUBINV_") || apiRef.startsWith("KYP-") || apiRef.startsWith("INV-")) {
      await completeIntasendBillingPayment({
        apiRef,
        amount,
        intasendInvoiceId: invoiceId,
        provider: "MPESA",
      });
    } else if (apiRef.startsWith("ORD_")) {
      await completeIntasendOrderPayment({
        apiRef,
        providerAmount: amount,
        intasendInvoiceId: invoiceId,
        provider: "MPESA",
      });
    }
  } catch (err) {
    console.error("[mock-checkout] error completing payment:", err);
  }

  const finalRedirect = new URL(redirectUrl, req.url);
  finalRedirect.searchParams.set("payment", "success");
  finalRedirect.searchParams.set("invoice_id", invoiceId);

  return NextResponse.redirect(finalRedirect.toString(), 303);
}
