Yes. After digging through IntaSend’s current documentation, I would **not use IntaSend’s Subscription API for your current situation**.

I would build the subscription lifecycle inside your application and use **IntaSend Checkout URLs as one-time renewal invoices**. The customer consciously presses **Renew subscription**, goes to IntaSend, pays, and your webhook extends their subscription.

That gives you a subscription product without automatic recurring charges.

### How IntaSend Checkout URL actually works

IntaSend exposes:

```text
POST https://api.intasend.com/api/v1/checkout/
```

and the checkout endpoint accepts fields including `amount`, `currency`, customer details, `api_ref`, `redirect_url`, payment method, and tariff configuration. It returns a hosted checkout URL that you redirect the customer to. ([IntaSend][1])

A particularly useful property for your case is that IntaSend says the Checkout Link API can be created with the **publishable key only**. Their API reference uses the `X-IntaSend-Public-API-Key` header, and their authentication documentation explicitly says the secret key isn't required merely to generate checkout links. ([IntaSend][1])

I would structure the flow like this:

1. Your database owns the plan and subscription: e.g. `Basic = KES 500/month`, `Professional = KES 1,500/month`. When renewal approaches, create a `SubscriptionInvoice` in your DB. When the customer presses **Pay / Renew**, your backend generates one IntaSend checkout URL with a unique `api_ref`, such as `SUBINV_a81d...`. Redirect them to IntaSend; they choose M-Pesa/card/etc. IntaSend sends your webhook status changes. Only when your backend sees a genuine `COMPLETE` transaction do you mark the invoice paid and extend the subscription. Next month, repeat the process with another invoice and another checkout URL. No card is automatically debited and no M-Pesa request is automatically triggered. ([IntaSend][2])

That is effectively:

```text
Your subscription engine
        ↓
Monthly invoice
        ↓
IntaSend checkout URL
        ↓
Customer explicitly pays
        ↓
IntaSend webhook
        ↓
Invoice PAID
        ↓
Subscription extended
```

## Why I prefer Checkout URL over a reusable Payment Link

IntaSend also has a `paymentlinks` API, including fixed amounts and usage limits. ([IntaSend][3])

I wouldn't use one generic link like:

```text
https://payment.intasend.com/pay/basic-plan
```

for every monthly subscription renewal.

Instead generate a Checkout URL corresponding to a specific invoice:

```text
Subscription:
SUB-123

Renewal invoice:
INV-2026-10-123

api_ref:
SUBINV_INV_2026_10_123

IntaSend checkout:
https://payment.intasend.com/...
```

Then reconciliation becomes extremely clean because IntaSend returns your `api_ref` in its payment webhook. ([IntaSend][2])

You immediately know:

```text
payment
    ↓
api_ref = SUBINV_INV_2026_10_123
    ↓
invoice
    ↓
subscription
    ↓
customer / pharmacy / tenant
```

That is much safer than trying to infer which subscription a generic payment belongs to.

---

# Implementation

For Next.js, I would implement something along these lines.

### Database

```prisma
enum SubscriptionStatus {
  ACTIVE
  DUE
  PAST_DUE
  EXPIRED
  CANCELED
}

enum InvoiceStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
  SUPERSEDED
}

model SubscriptionPlan {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  amount      Decimal  @db.Decimal(12, 2)
  currency    String   @default("KES")
  interval    String   @default("MONTH")
  intervalQty Int      @default(1)
  active      Boolean  @default(true)

  subscriptions Subscription[]
}

model Subscription {
  id               String             @id @default(cuid())
  userId           String
  planId           String
  status           SubscriptionStatus @default(ACTIVE)

  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  graceEndsAt        DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  plan     SubscriptionPlan    @relation(fields: [planId], references: [id])
  invoices SubscriptionInvoice[]

  @@index([userId])
  @@index([status])
}

model SubscriptionInvoice {
  id             String        @id @default(cuid())
  subscriptionId String
  apiRef         String        @unique

  amount         Decimal       @db.Decimal(12, 2)
  currency       String        @default("KES")
  status         InvoiceStatus @default(PENDING)

  periodStart    DateTime
  periodEnd      DateTime

  checkoutUrl    String?
  intasendInvoiceId String?
  provider       String?
  paidAt         DateTime?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  subscription Subscription @relation(
    fields: [subscriptionId],
    references: [id]
  )

  @@index([subscriptionId])
  @@index([status])
}
```

Notice something important here:

**IntaSend does not own your subscription.**

Your database does.

IntaSend only owns the individual payment transaction.

---

# Creating the checkout

For example:

```ts
// app/api/billing/checkout/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const INTASEND_BASE_URL =
  process.env.INTASEND_TEST === "true"
    ? "https://sandbox.intasend.com"
    : "https://api.intasend.com";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscriptionId } = await req.json();

  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId: session.user.id,
    },
    include: {
      plan: true,
    },
  });

  if (!subscription || !subscription.plan.active) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 },
    );
  }

  //
  // NEVER accept amount/currency from the browser.
  // Always derive them from your DB.
  //

  const now = new Date();

  const baseDate =
    subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
      ? subscription.currentPeriodEnd
      : now;

  const periodStart = baseDate;

  const periodEnd = new Date(baseDate);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  //
  // Reuse an existing unpaid invoice for this renewal.
  //

  let invoice = await prisma.subscriptionInvoice.findFirst({
    where: {
      subscriptionId,
      status: {
        in: ["PENDING", "PROCESSING"],
      },
      periodStart,
    },
  });

  if (!invoice) {
    const id = crypto.randomUUID();

    invoice = await prisma.subscriptionInvoice.create({
      data: {
        id,
        subscriptionId,
        apiRef: `SUBINV_${id}`,
        amount: subscription.plan.amount,
        currency: subscription.plan.currency,
        periodStart,
        periodEnd,
      },
    });
  }

  //
  // If checkout already exists, reuse it.
  //

  if (invoice.checkoutUrl) {
    return NextResponse.json({
      checkoutUrl: invoice.checkoutUrl,
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const response = await fetch(`${INTASEND_BASE_URL}/api/v1/checkout/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IntaSend-Public-API-Key": process.env.INTASEND_PUBLISHABLE_KEY!,
    },
    body: JSON.stringify({
      amount: invoice.amount.toString(),
      currency: invoice.currency,

      api_ref: invoice.apiRef,

      email: session.user.email,
      first_name: session.user.name ?? undefined,
      country: "KE",

      host: baseUrl,

      redirect_url: `${baseUrl}/billing/payment-return?invoice=${invoice.id}`,

      channel: "WEBSITE",

      //
      // Do NOT specify method if you want IntaSend
      // to present available payment methods.
      //

      mobile_tarrif: "BUSINESS-PAYS",
      card_tarrif: "BUSINESS-PAYS",
    }),
  });

  if (!response.ok) {
    const error = await response.text();

    console.error("IntaSend checkout failure", error);

    return NextResponse.json(
      { error: "Unable to create checkout" },
      { status: 502 },
    );
  }

  const checkout = await response.json();

  await prisma.subscriptionInvoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      checkoutUrl: checkout.url,
      intasendInvoiceId: checkout.invoice_id ?? null,
    },
  });

  return NextResponse.json({
    checkoutUrl: checkout.url,
  });
}
```

The current API reference lists M-Pesa, PesaLink, cards, Google Pay, Apple Pay and several additional methods; actual availability will depend on your IntaSend account and geography. If you omit `method`, you're not artificially restricting the checkout to one rail. ([IntaSend][1])

Your frontend becomes trivial:

```ts
async function renewSubscription(subscriptionId: string) {
  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscriptionId,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error);
  }

  window.location.href = result.checkoutUrl;
}
```

The UI just says something like:

```text
Professional
KES 1,500 / month

Renews manually on 16 October 2026

[ Renew subscription ]
```

I would explicitly call it **manual renewal**, rather than implying automatic billing.

---

# The webhook is the critical part

Don't activate the subscription from this page:

```text
/billing/payment-return
```

The redirect is UX only.

A customer being redirected somewhere should never constitute payment proof.

IntaSend sends payment-state webhooks containing fields including:

```text
invoice_id
state
provider
charges
net_amount
currency
value
api_ref
challenge
```

and documents `PENDING`, `PROCESSING`, `COMPLETE`, and `FAILED` states. ([IntaSend][2])

Your webhook might look conceptually like:

```ts
// app/api/webhooks/intasend/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const event = await req.json();

  //
  // IntaSend lets you configure a challenge string
  // for webhook verification.
  //

  if (
    !event.challenge ||
    event.challenge !== process.env.INTASEND_WEBHOOK_CHALLENGE
  ) {
    return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
  }

  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: {
      apiRef: event.api_ref,
    },
    include: {
      subscription: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ received: true });
  }

  //
  // Idempotency.
  //

  if (invoice.status === "PAID") {
    return NextResponse.json({
      received: true,
    });
  }

  if (event.currency !== invoice.currency) {
    return NextResponse.json({ error: "Currency mismatch" }, { status: 400 });
  }

  if (event.state === "PROCESSING") {
    await prisma.subscriptionInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: "PROCESSING",
        provider: event.provider,
        intasendInvoiceId: event.invoice_id,
      },
    });

    return NextResponse.json({
      received: true,
    });
  }

  if (event.state === "FAILED") {
    await prisma.subscriptionInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: "FAILED",
        provider: event.provider,
        intasendInvoiceId: event.invoice_id,
      },
    });

    return NextResponse.json({
      received: true,
    });
  }

  if (event.state !== "COMPLETE") {
    return NextResponse.json({
      received: true,
    });
  }

  //
  // We chose BUSINESS-PAYS above, so the customer-facing
  // payment amount should match the invoice amount.
  //

  const expectedAmount = Number(invoice.amount);
  const paidAmount = Number(event.value);

  if (Math.abs(expectedAmount - paidAmount) > 0.01) {
    console.error("IntaSend payment amount mismatch", {
      invoice: invoice.id,
      expectedAmount,
      paidAmount,
    });

    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    //
    // Lock logically through idempotent update.
    //

    const current = await tx.subscriptionInvoice.findUnique({
      where: {
        id: invoice.id,
      },
    });

    if (!current || current.status === "PAID") {
      return;
    }

    await tx.subscriptionInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: "PAID",
        provider: event.provider,
        intasendInvoiceId: event.invoice_id,
        paidAt: new Date(),
      },
    });

    await tx.subscription.update({
      where: {
        id: invoice.subscriptionId,
      },
      data: {
        status: "ACTIVE",
        currentPeriodStart: invoice.periodStart,
        currentPeriodEnd: invoice.periodEnd,
        graceEndsAt: null,
      },
    });
  });

  return NextResponse.json({
    received: true,
  });
}
```

IntaSend recommends an HTTPS webhook endpoint, allows you to configure a challenge value for validation, and retries webhook delivery when attempts fail. That makes idempotent processing essential. ([IntaSend][4])

---

# Add a second verification path

I would make this even more defensive.

When you receive:

```text
state = COMPLETE
```

you can perform a server-side reconciliation against IntaSend before provisioning expensive functionality.

IntaSend documents checking a payment using the returned `invoice_id`, and the resulting invoice data contains the payment state, amount, currency and `api_ref`. ([IntaSend][5])

So conceptually:

```text
Webhook says COMPLETE
        ↓
check challenge
        ↓
lookup api_ref
        ↓
optionally query IntaSend invoice status
        ↓
verify:
    COMPLETE
    correct invoice_id
    correct api_ref
    correct currency
    correct amount
        ↓
atomic DB transaction
        ↓
activate subscription
```

That's the pattern I would use for something like SaaS access.

---

# Recurring without automatic payments

This is the part that I think fits your compliance problem especially well.

Suppose someone subscribes on:

```text
16 Sep 2026
```

and pays:

```text
KES 500
```

Their DB record becomes:

```text
ACTIVE

currentPeriodStart:
2026-09-16

currentPeriodEnd:
2026-10-16
```

Around October 9 you can show:

```text
Your subscription renews in 7 days.

KES 500
Due 16 Oct

[ Pay renewal ]
```

You're allowed to automate **the reminders**, just not the charge.

Then on October 16:

```text
Subscription payment due

KES 500

[ Renew with IntaSend ]
```

Clicking it creates/reuses:

```text
SUBINV_xyz
        ↓
IntaSend Checkout URL
```

If they pay:

```text
COMPLETE
```

and their new period becomes:

```text
16 Oct → 16 Nov
```

If they don't pay, I would give a configurable grace period:

```text
16 Oct
DUE

↓ 3-7 days

PAST_DUE

↓

EXPIRED
```

And still show:

```text
Your subscription has expired.

No data has been deleted.

[ Renew subscription ]
```

After payment:

```text
EXPIRED
   ↓
checkout
   ↓
COMPLETE
   ↓
ACTIVE
```

No automatic debit ever occurs.

---

# One important UX improvement

If somebody renews **early**, don't lose their remaining days.

If current access is:

```text
expires:
16 Oct
```

and they pay on:

```text
10 Oct
```

don't create:

```text
10 Oct → 10 Nov
```

Instead create:

```text
16 Oct → 16 Nov
```

Your code already uses:

```ts
const baseDate =
  subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
    ? subscription.currentPeriodEnd
    : now;
```

Therefore:

```text
early payment → extends existing period
late payment  → new period starts now
```

That's a much better subscription experience.

---

# BUSINESS-PAYS vs CUSTOMER-PAYS

I'd initially use:

```ts
mobile_tarrif: "BUSINESS-PAYS",
card_tarrif: "BUSINESS-PAYS",
```

IntaSend supports both configurations. ([IntaSend][1])

That means when you advertise:

```text
KES 500/month
```

the customer sees something much closer to:

```text
Pay KES 500
```

rather than:

```text
KES 500
+
processing fees
```

Your business absorbs the payment processing cost.

It also makes reconciliation simpler.

Later you can choose `CUSTOMER-PAYS` if your economics require it, but you'll need to account carefully for the relationship between the transaction's gross `value`, charges and `net_amount`.

---

# Don't let the frontend specify prices

This is especially important.

Never do:

```ts
POST /api/checkout

{
  "amount": 500,
  "plan": "professional"
}
```

and trust `amount`.

Someone can send:

```json
{
  "amount": 1,
  "plan": "professional"
}
```

Instead accept:

```json
{
  "subscriptionId": "abc123"
}
```

Then calculate server-side:

```text
subscription
     ↓
plan
     ↓
plan.amount
     ↓
IntaSend
```

The frontend should have no authority over money.

---

# Checkout URLs also simplify your security scope

Another thing I like about this architecture is that the sensitive payment UX remains with IntaSend.

Your system does not need to collect:

```text
card number
expiry
CVV
M-Pesa PIN
```

You're basically saying:

```text
We need KES 500 for invoice X.

IntaSend, please handle payment.
```

and then:

```text
IntaSend → webhook → COMPLETE
```

The checkout documentation specifically describes this as IntaSend providing the secure checkout link and handling the payment flow. ([IntaSend][6])

---

# Compliance caveat

There's an important distinction here.

This design helps you avoid implementing **automatic recurring charges**, but it does not mean you can avoid IntaSend's merchant compliance process.

IntaSend currently states that merchants must undergo account verification before transacting, including personal/business verification depending on account type. ([IntaSend Support][7])

So think of this architecture as:

```text
manual recurring payments
+
lower integration complexity
+
no automatic debiting
+
no stored card mandate
+
customer authorizes every payment
```

not:

```text
bypass IntaSend KYC
```

Those are different issues.

---

# The architecture I'd ship

I'd therefore build:

```text
SubscriptionPlan
       │
       ▼
Subscription
       │
       ▼
SubscriptionInvoice
       │
       ├── amount
       ├── periodStart
       ├── periodEnd
       ├── apiRef
       ├── checkoutUrl
       └── payment status
       │
       ▼
IntaSend Checkout
       │
       ▼
Customer pays manually
       │
       ▼
IntaSend Webhook
       │
       ▼
Verify payment
       │
       ▼
Invoice = PAID
       │
       ▼
Subscription = ACTIVE
```

For your current constraints, this is the architecture I would choose over IntaSend's native recurring-subscription API. It preserves the **SaaS subscription experience** while making every financial transaction a deliberate customer-authorized hosted checkout payment.

[1]: https://developers.intasend.com/reference/api_v1_checkout_create "Create Checkout"
[2]: https://developers.intasend.com/docs/payment-collection-events "Payment Collection Events"
[3]: https://developers.intasend.com/reference/api_v1_paymentlinks_create?utm_source=chatgpt.com "Create Paymentlinks"
[4]: https://developers.intasend.com/docs/setup?utm_source=chatgpt.com "How to Setup Webhook"
[5]: https://developers.intasend.com/docs/payment-status "Payment Status"
[6]: https://developers.intasend.com/docs/checkout-links "Checkout Link API"
[7]: https://support.intasend.com/portal/en/kb/articles/how-to-get-started-with-intasend-accounts-verification?utm_source=chatgpt.com "How to get Started with Intasend Accounts Verification"
