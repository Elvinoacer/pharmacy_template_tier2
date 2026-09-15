import { getBrowseLocation } from "@/app/lib/browse-location";
import { distanceKm, proximityOrder } from "@/app/lib/proximity";
import { medicineDisplayName } from "@/app/lib/prescription-discovery";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { prismaUnscoped } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import {
  fileToDataUrl,
  identifyMedicationFromImage,
  validateMedicationImage,
} from "@/app/lib/services/medication-image-search";
import {
  MAX_PRESCRIPTION_MEDICINES,
  matchesPrescriptionName,
} from "@/app/lib/prescription-discovery";
import {
  availabilitySearchFeedback,
  photoReadFeedback,
  type UploadFeedbackModel,
} from "@/app/lib/prescription-upload-feedback";

export const runtime = "nodejs";
const schema = z.object({
  names: z
    .array(z.string().trim().min(2).max(120))
    .min(1)
    .max(MAX_PRESCRIPTION_MEDICINES),
  area: z.string().trim().max(100).optional(),
});
const headers = { "Cache-Control": "private, no-store" };

function payload(
  feedback: UploadFeedbackModel,
  extra: Record<string, unknown> = {},
  status = 200,
) {
  return NextResponse.json(
    {
      ok: status < 400,
      error: feedback.message,
      ...feedback,
      ...extra,
    },
    {
      status,
      headers:
        status === 429 && typeof extra.retryAfterSeconds === "number"
          ? { ...headers, "Retry-After": String(extra.retryAfterSeconds) }
          : headers,
    },
  );
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const isPhoto = Boolean(
    request.headers.get("content-type")?.includes("multipart/form-data"),
  );
  const limit = await checkRateLimitAsync(`prescription-search:${ip}`, {
    limit: 12,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!limit.allowed) {
    const feedback = isPhoto
      ? photoReadFeedback({
          code: "rate_limited",
          retryAfterSeconds: limit.retryAfterSeconds,
        })
      : availabilitySearchFeedback({
          code: "rate_limited",
          retryAfterSeconds: limit.retryAfterSeconds,
        });
    return payload(feedback, { retryAfterSeconds: limit.retryAfterSeconds }, 429);
  }
  try {
    if (isPhoto) {
      const form = await request.formData();
      const file = form.get("image");
      if (!(file instanceof File))
        return payload(photoReadFeedback({ code: "missing_file" }), { names: [] }, 400);
      const invalid = validateMedicationImage(file);
      if (invalid)
        return payload(
          photoReadFeedback({ code: invalid.error }),
          { names: [] },
          invalid.error === "file_too_large" ? 413 : 400,
        );
      if (!process.env.GROQ_API_KEY?.trim())
        return payload(
          photoReadFeedback({ code: "ai_unavailable" }),
          { names: [] },
          503,
        );
      const identified = await identifyMedicationFromImage(
        await fileToDataUrl(file),
        "prescription",
      );
      const names = identified.map((item) =>
        [
          item.name,
          item.strength &&
          !item.name.toLowerCase().includes(item.strength.toLowerCase())
            ? item.strength
            : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return payload(
        photoReadFeedback({
          code: names.length ? "read_ok" : "unreadable",
          nameCount: names.length,
        }),
        { names },
      );
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return payload(availabilitySearchFeedback({ code: "validation" }), {}, 400);
    const { names, area } = parsed.data;
    const origin = await getBrowseLocation();
    const results = await withPlatformBypass(async () =>
      Promise.all(
        names.map(async (name) => {
          // Narrow at the database, then require all name and strength tokens below.
          const term =
            name.split(/\s+/).find((token) => /[a-z]/i.test(token)) || name;
          const rows = await prismaUnscoped.pharmacyInventory.findMany({
            where: {
              active: true,
              publicListing: true,
              currentStock: { gt: 0 },
              pharmacy: {
                status: "active",
                listed: true,
                verifiedAt: { not: null },
                ...(area
                  ? {
                      OR: [
                        {
                          city: {
                            contains: area,
                            mode: "insensitive" as const,
                          },
                        },
                        {
                          county: {
                            contains: area,
                            mode: "insensitive" as const,
                          },
                        },
                      ],
                    }
                  : {}),
              },
              medicationMaster: {
                status: "active",
                OR: [
                  { name: { contains: term, mode: "insensitive" } },
                  { genericName: { contains: term, mode: "insensitive" } },
                  { brandName: { contains: term, mode: "insensitive" } },
                ],
              },
            },
            select: {
              id: true,
              slug: true,
              price: true,
              updatedAt: true,
              medicationMaster: {
                select: {
                  name: true,
                  genericName: true,
                  brandName: true,
                  strengthDisplay: true,
                },
              },
              pharmacy: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  city: true,
                  county: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
            orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
            take: origin ? undefined : 200,
          });
          return {
            name,
            truncated: rows.length >= 200,
            matches: rows
              .filter((row) => {
                const med = row.medicationMaster;
                return matchesPrescriptionName(name, [
                  med.name,
                  `${med.genericName} ${med.strengthDisplay || ""}`,
                  `${med.brandName || ""} ${med.strengthDisplay || ""}`,
                ]);
              })
              .map((row) => ({
                id: row.id,
                name: medicineDisplayName(row.medicationMaster.name, row.medicationMaster.strengthDisplay),
                price: Number(row.price),
                updatedAt: row.updatedAt.toISOString(),
                href: `/p/${row.pharmacy.slug}/medicines/${row.slug}`,
                pharmacy: { ...row.pharmacy, distanceKm: origin ? distanceKm(origin, row.pharmacy) : null },
              })).sort((a, b) => proximityOrder(a.pharmacy, b.pharmacy)).slice(0, 200),
          };
        }),
      ),
    );
    return NextResponse.json({ results, ok: true }, { headers });
  } catch {
    return payload(
      isPhoto
        ? photoReadFeedback({ code: "read_failed" })
        : availabilitySearchFeedback({ code: "search_failed" }),
      isPhoto ? { names: [] } : {},
      503,
    );
  }
}
