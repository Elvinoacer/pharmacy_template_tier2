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

export const runtime = "nodejs";
const schema = z.object({
  names: z
    .array(z.string().trim().min(2).max(120))
    .min(1)
    .max(MAX_PRESCRIPTION_MEDICINES),
  area: z.string().trim().max(100).optional(),
});
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await checkRateLimitAsync(`prescription-search:${ip}`, {
    limit: 12,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Too many searches. Please try again shortly." },
      {
        status: 429,
        headers: { ...headers, "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("image");
      if (!(file instanceof File))
        return NextResponse.json(
          { error: "Choose a prescription photo." },
          { status: 400, headers },
        );
      const invalid = validateMedicationImage(file);
      if (invalid)
        return NextResponse.json(
          { error: invalid.message },
          { status: 400, headers },
        );
      if (!process.env.GROQ_API_KEY?.trim())
        return NextResponse.json(
          {
            error:
              "Photo reading is unavailable. Enter the medicine names below to check availability.",
          },
          { status: 503, headers },
        );
      const identified = await identifyMedicationFromImage(
        await fileToDataUrl(file),
        "prescription",
      );
      return NextResponse.json(
        {
          names: identified.map((item) =>
            [
              item.name,
              item.strength &&
              !item.name.toLowerCase().includes(item.strength.toLowerCase())
                ? item.strength
                : null,
            ]
              .filter(Boolean)
              .join(" "),
          ),
        },
        { headers },
      );
    }
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        {
          error:
            "Enter 1–12 medicine names, one per line (up to 120 characters each).",
        },
        { status: 400, headers },
      );
    const { names, area } = parsed.data;
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
                },
              },
            },
            orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
            take: 200,
          });
          return {
            name,
            truncated: rows.length === 200,
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
                pharmacy: row.pharmacy,
              })),
          };
        }),
      ),
    );
    return NextResponse.json({ results }, { headers });
  } catch {
    return NextResponse.json(
      { error: "We couldn’t check availability right now. Please try again." },
      { status: 503, headers },
    );
  }
}
