import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import { createEnquiry } from "@/app/lib/services/crm";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { formatMpesaPhone } from "@/app/lib/services/daraja";

const ContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9).max(24),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const rl = await checkRateLimitAsync(`public-contact:${clientIp(request)}`, {
    limit: 6,
    windowMs: 10 * 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const raw = (await request.json()) as Record<string, unknown>;
    if (raw.company) return NextResponse.json({ ok: true });

    const parsed = ContactSchema.safeParse({
      name: raw.name,
      phone: raw.phone,
      email: raw.email,
      subject: raw.subject,
      message: raw.message,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_failed", fields: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const phone = formatMpesaPhone(parsed.data.phone);
    if (!/^254\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "validation_failed", fields: { phone: ["Enter a valid Kenyan phone number."] } },
        { status: 400 },
      );
    }

    const session = await getSessionUser();
    await createEnquiry({
      name: parsed.data.name,
      phone,
      email: parsed.data.email.toLowerCase(),
      subject: parsed.data.subject,
      message: parsed.data.message,
      type: "contact",
      customerId: session?.customerId ?? undefined,
      source: "website",
    });

    revalidatePath("/admin/enquiries");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact]", err);
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not submit enquiry" }, { status: 500 });
  }
}
