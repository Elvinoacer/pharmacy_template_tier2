import "server-only";

type DeliveryChannel = "email" | "sms" | "whatsapp" | "portal" | "in_app" | "push";

export type DeliveryRecipient = {
  email?: string | null;
  phone?: string | null;
};

export type DeliveryPayload = {
  channel: DeliveryChannel;
  recipient: DeliveryRecipient;
  subject?: string | null;
  body: string;
};

export type DeliveryResult = {
  status: "sent" | "delivered" | "failed" | "pending";
  provider?: string;
  providerMessageId?: string;
  error?: string;
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

async function sendEmail(payload: DeliveryPayload): Promise<DeliveryResult> {
  if (!payload.recipient.email) return { status: "failed", error: "Customer email is missing" };

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!resendKey || !from) return { status: "pending", error: "Email provider is not configured" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.recipient.email,
      subject: payload.subject || "Aether Pharmacy",
      text: payload.body,
    }),
  });

  const json = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok) {
    return { status: "failed", provider: "resend", error: json?.message || response.statusText };
  }

  return { status: "sent", provider: "resend", providerMessageId: json?.id };
}

async function sendSms(payload: DeliveryPayload): Promise<DeliveryResult> {
  if (!payload.recipient.phone) return { status: "failed", error: "Customer phone is missing" };

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_SMS_FROM?.trim();
  if (!sid || !token || !from) return { status: "pending", error: "SMS provider is not configured" };

  const params = new URLSearchParams({
    To: payload.recipient.phone,
    From: from,
    Body: payload.body,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const json = (await response.json().catch(() => null)) as { sid?: string; message?: string } | null;
  if (!response.ok) {
    return { status: "failed", provider: "twilio", error: json?.message || response.statusText };
  }

  return { status: "sent", provider: "twilio", providerMessageId: json?.sid };
}

async function sendWhatsapp(payload: DeliveryPayload): Promise<DeliveryResult> {
  if (!payload.recipient.phone) return { status: "failed", error: "Customer phone is missing" };

  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    return { status: "pending", error: "WhatsApp provider is not configured" };
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: payload.recipient.phone.replace(/^\+/, ""),
      type: "text",
      text: { preview_url: false, body: payload.body },
    }),
  });

  const json = (await response.json().catch(() => null)) as
    | { messages?: { id?: string }[]; error?: { message?: string } }
    | null;
  if (!response.ok) {
    return { status: "failed", provider: "whatsapp_cloud", error: json?.error?.message || response.statusText };
  }

  return { status: "sent", provider: "whatsapp_cloud", providerMessageId: json?.messages?.[0]?.id };
}

export async function sendDelivery(payload: DeliveryPayload): Promise<DeliveryResult> {
  try {
    if (payload.channel === "portal" || payload.channel === "in_app" || payload.channel === "push") {
      return { status: "delivered", provider: "portal" };
    }
    if (payload.channel === "email") return sendEmail(payload);
    if (payload.channel === "sms") return sendSms(payload);
    if (payload.channel === "whatsapp") return sendWhatsapp(payload);
    return { status: "failed", error: `Unsupported channel: ${payload.channel}` };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Delivery failed",
    };
  }
}

export function passwordResetBody(token: string) {
  return `Use this password reset link: ${appUrl()}/reset-password?token=${token}\n\nIf you did not request this, ignore this message.`;
}

export function emailVerificationBody(token: string) {
  return `Verify your email address: ${appUrl()}/api/verify-email?token=${token}\n\nIf you did not create an Aether Pharmacy account, ignore this message.`;
}
