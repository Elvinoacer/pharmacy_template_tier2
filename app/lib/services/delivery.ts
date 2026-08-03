import "server-only";

type DeliveryChannel = "email" | "sms" | "whatsapp" | "portal" | "in_app" | "push";

export type DeliveryRecipient = {
  email?: string | null;
  phone?: string | null;
  preferences?: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    whatsappEnabled?: boolean;
  } | null;
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

/**
 * The support email shown in every outbound email footer. Override via
 * SUPPORT_EMAIL env if needed. Default is support@gtss.software.
 */
function supportEmail() {
  return process.env.SUPPORT_EMAIL?.trim() || "support@gtss.software";
}

function supportPhone() {
  return process.env.SUPPORT_PHONE?.trim() || "0790670542";
}

/**
 * Convert a (potentially) Markdown body into safe HTML for email.
 * Implements the same subset as the client-side Markdown component so what
 * staff compose in the campaign/template editor is what customers see in
 * their inbox.
 *
 * Why not pull in `marked`? Adding deps would change package.json + lockfile
 * (and the user explicitly wants .git untouched). This renderer covers:
 * headings, bold, italic, inline code, links, lists, blockquotes, hr, paragraphs.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  let t = escapeHtml(text);
  t = t.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 5px;border-radius:4px;font-family:ui-monospace,monospace;font-size:0.9em;">$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  t = t.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    '<a href="$2" style="color:#0d6e5a;text-decoration:underline;font-weight:600;">$1</a>',
  );
  t = t.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return t;
}

function renderMarkdownToEmailHtml(src: string): string {
  if (!src) return "";
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p style="margin:0 0 14px 0;font-size:15px;line-height:24px;color:#334155;">${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeLists = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      i++;
      continue;
    }
    if (/^\s*([-*]){3,}\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      out.push('<hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;" />');
      i++;
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushParagraph();
      closeLists();
      const level = h[1].length;
      const sizes = ["26px", "22px", "19px", "17px", "16px", "15px"];
      out.push(`<h${level} style="margin:20px 0 10px 0;font-size:${sizes[level - 1]};font-weight:700;color:#0c1a14;letter-spacing:-0.3px;">${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      closeLists();
      out.push(`<blockquote style="border-left:3px solid #0d6e5a;margin:0 0 14px 0;padding:6px 0 6px 14px;color:#475569;font-style:italic;">${renderInline(line.replace(/^\s*>\s?/, ""))}</blockquote>`);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push('<ul style="margin:0 0 14px 0;padding-left:22px;font-size:15px;line-height:24px;color:#334155;">'); inUl = true; }
      out.push(`<li style="margin:4px 0;">${renderInline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      i++;
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flushParagraph();
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push('<ol style="margin:0 0 14px 0;padding-left:22px;font-size:15px;line-height:24px;color:#334155;">'); inOl = true; }
      out.push(`<li style="margin:4px 0;">${renderInline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`);
      i++;
      continue;
    }
    closeLists();
    paragraph.push(line);
    i++;
  }
  flushParagraph();
  closeLists();
  return out.join("\n");
}

function buildEmailHtml(subject: string, bodyText: string) {
  const renderedBody = renderMarkdownToEmailHtml(bodyText);
  const support = supportEmail();
  const phone = supportPhone();
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #F8FAFC; padding: 60px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); overflow: hidden;">
          <tr>
            <td style="padding: 36px 36px 24px 36px; text-align: center; border-bottom: 1px solid #F1F5F9; background: linear-gradient(135deg, #0d6e5a, #084c3f);">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">Aether Pharmacy</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.85);">Your trusted health partner</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px;">
              <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #0c1a14;">${escapeHtml(subject)}</h2>
              <div style="font-size: 15px; line-height: 24px; color: #334155;">
                ${renderedBody}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 36px; background-color: #F8FAFC; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 13px; color: #64748B; font-weight: 500;">
                &copy; ${year} Aether Pharmacy. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #94A3B8;">
                Need help? <a href="mailto:${support}" style="color: #0d6e5a; text-decoration: none; font-weight: 600;">${support}</a><br>
                Or call <a href="tel:${phone.replace(/\s/g, "")}" style="color: #0d6e5a; text-decoration: none; font-weight: 600;">${phone}</a>
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

void appUrl;

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
    // Enforce customer communication preferences — if they've disabled a channel,
    // we never send via it. Caller is expected to have populated `recipient.preferences`
    // (we don't fetch it here to keep sendDelivery pure; the calling service does that).
    if (payload.channel === "email" && payload.recipient.preferences?.emailEnabled === false) {
      return { status: "failed", error: "Customer has disabled email" };
    }
    if (payload.channel === "sms" && payload.recipient.preferences?.smsEnabled === false) {
      return { status: "failed", error: "Customer has disabled SMS" };
    }
    if (payload.channel === "whatsapp" && payload.recipient.preferences?.whatsappEnabled === false) {
      return { status: "failed", error: "Customer has disabled WhatsApp" };
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
  return `Use this password reset link: ${appUrl()}/reset-password?token=${token}\n\nIf you did not request this, ignore this message.\n\n— Aether Pharmacy (${supportEmail()})`;
}

export function emailVerificationBody(token: string) {
  return `Verify your email address: ${appUrl()}/api/verify-email?token=${token}\n\nIf you did not create an Aether Pharmacy account, ignore this message.\n\n— Aether Pharmacy (${supportEmail()})`;
}
