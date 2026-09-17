"use server";

import { z } from "zod";
import { prismaUnscoped } from "@/app/lib/db";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { getRequestMeta } from "@/app/lib/request-meta";

export type NewsletterState = {
  success?: boolean;
  message?: string;
  error?: string;
};

const EmailSchema = z.string().trim().email("Please enter a valid email address.").max(254);

export async function subscribeNewsletterAction(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const rawEmail = String(formData.get("email") || "");
  const pharmacySlug = String(formData.get("pharmacySlug") || "").trim() || null;

  const parsed = EmailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid email address." };
  }
  const email = parsed.data.toLowerCase();

  const meta = await getRequestMeta();
  const rl = await checkRateLimitAsync(`newsletter:${meta.ip || "unknown"}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return { error: "Too many subscription attempts. Please try again later." };
  }

  try {
    let pharmacyId: string | null = null;
    if (pharmacySlug) {
      const p = await prismaUnscoped.pharmacy.findUnique({
        where: { slug: pharmacySlug },
        select: { id: true },
      });
      if (p) pharmacyId = p.id;
    }

    if (!pharmacyId) {
      const defaultP = await prismaUnscoped.pharmacy.findFirst({
        where: { status: "active", listed: true },
        select: { id: true },
      });
      pharmacyId = defaultP?.id || "00000000-0000-0000-0000-000000000000";
    }

    // Check if already subscribed to avoid duplicate spam
    const existing = await prismaUnscoped.enquiry.findFirst({
      where: {
        email,
        source: "footer_newsletter",
        pharmacyId,
      },
    });

    if (!existing) {
      await prismaUnscoped.enquiry.create({
        data: {
          pharmacyId,
          name: "Newsletter Subscriber",
          email,
          type: "general",
          subject: "Newsletter Subscription",
          message: `Newsletter subscription requested for ${email}`,
          source: "footer_newsletter",
          status: "new",
        },
      });
    }

    return {
      success: true,
      message: "Thank you for subscribing! We will keep you updated with health tips and news.",
    };
  } catch (err) {
    console.error("[subscribeNewsletterAction]", err);
    return { error: "Unable to process subscription. Please try again later." };
  }
}
