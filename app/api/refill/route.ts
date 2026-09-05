import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import { getTenant } from "@/app/lib/tenant";
import { createRefillRequest } from "@/app/lib/services/crm";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { formatMpesaPhone } from "@/app/lib/services/daraja";

const RefillSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9).max(24),
  medicine: z.string().trim().min(2).max(180),
  pickupDate: z.string().trim().min(8).max(32),
  rxReference: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  pickupPreference: z.enum(["pickup", "delivery"]),
  preferredTime: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1500).optional(),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const rl = await checkRateLimitAsync(`public-refill:${clientIp(request)}`, {
    limit: 8,
    windowMs: 10 * 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many refill requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const raw = (await request.json()) as Record<string, unknown>;

    // Honeypot. Do not tell bots why their request was ignored.
    if (raw.website) return NextResponse.json({ ok: true });

    const tenant = await getTenant();
    if (!tenant.pharmacyId || tenant.bypass) {
      return NextResponse.json(
        { error: "Choose a pharmacy before submitting a refill request" },
        { status: 409 },
      );
    }

    const session = await getSessionUser();
    const parsed = RefillSchema.safeParse({
      fullName: raw.fullName,
      phone: raw.phone,
      medicine: raw.medicine ?? raw.medicineName,
      pickupDate: raw.pickupDate ?? raw.preferredDate,
      rxReference: raw.rxNumber ?? raw.rxReference,
      email: raw.email ?? session?.email ?? "",
      pickupPreference:
        raw.delivery === "yes" || raw.pickupPreference === "delivery" ? "delivery" : "pickup",
      preferredTime: raw.preferredTime,
      notes: raw.notes,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "validation_failed",
          fields: parsed.error.flatten().fieldErrors,
        },
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

    const preferredDate = new Date(`${parsed.data.pickupDate}T00:00:00`);
    if (Number.isNaN(preferredDate.getTime())) {
      return NextResponse.json(
        { error: "validation_failed", fields: { pickupDate: ["Enter a valid pickup date."] } },
        { status: 400 },
      );
    }
    const earliest = new Date();
    earliest.setHours(0, 0, 0, 0);
    if (preferredDate < earliest) {
      return NextResponse.json(
        { error: "validation_failed", fields: { pickupDate: ["Pickup date cannot be in the past."] } },
        { status: 400 },
      );
    }

    await createRefillRequest({
      customerId: session?.customerId ?? null,
      medicineName: parsed.data.medicine,
      rxReference: parsed.data.rxReference || undefined,
      customerName: parsed.data.fullName,
      phone,
      email: parsed.data.email || undefined,
      pickupPreference: parsed.data.pickupPreference,
      preferredDate: parsed.data.pickupDate,
      preferredTime: parsed.data.preferredTime || undefined,
      notes: parsed.data.notes || undefined,
      source: session?.customerId ? "portal" : "website",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[refill]", err);
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not submit refill request" }, { status: 500 });
  }
}
