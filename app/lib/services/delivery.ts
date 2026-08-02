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

function buildEmailHtml(subject: string, bodyText: string) {
  const formattedBody = bodyText
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      if (p.match(urlRegex)) {
        return `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #334155;">` +
          p.replace(urlRegex, `</p><table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;"><tr><td align="center"><a href="$1" style="display: inline-block; padding: 14px 32px; background-color: #0F172A; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Access Link</a></td></tr></table><p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #334155;">`) +
          `</p>`;
      }
      return `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #334155;">` + p + `</p>`;
    })
    .join('');

  const cleanedBody = formattedBody.replace(/<p[^>]*><\/p>/g, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #F8FAFC; padding: 60px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); overflow: hidden;">
          <tr>
            <td style="padding: 48px 48px 32px 48px; text-align: center; border-bottom: 1px solid #F1F5F9; background: linear-gradient(to bottom, #FFFFFF, #F8FAFC);">
              <div style="margin-bottom: 24px;">
                <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                  <tr>
                    <td style="background-color: #F0F9FF; padding: 16px; border-radius: 20px;">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                        <path d="m8.5 8.5 7 7"/>
                      </svg>
                    </td>
                  </tr>
                </table>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;">Aether Pharmacy</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 48px;">
              <h2 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 700; color: #0F172A;">${subject}</h2>
              <div style="font-size: 16px; line-height: 26px; color: #475569;">
                ${cleanedBody}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 48px; background-color: #F8FAFC; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 14px; color: #64748B; font-weight: 500;">
                &copy; ${new Date().getFullYear()} Aether Pharmacy. All rights reserved.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #94A3B8;">
                123 Health Avenue, Wellness District<br>
                Need help? <a href="mailto:support@aetherpharmacy.com" style="color: #0EA5E9; text-decoration: none; font-weight: 500;">Contact Support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      html: buildEmailHtml(payload.subject || "Aether Pharmacy", payload.body)
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
