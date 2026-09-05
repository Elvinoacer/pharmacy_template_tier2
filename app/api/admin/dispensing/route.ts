import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { requirePermission } from "@/app/lib/platform/policy";
import { getDispensingRegister, exportDispensingRegisterCsv } from "@/app/lib/services/dispensing";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    await requirePermission(user, "prescriptions.read");

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 25);
    const q = searchParams.get("q") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const controlledOnly = searchParams.get("controlledOnly") === "true";
    const substitutionsOnly = searchParams.get("substitutionsOnly") === "true";
    const customerId = searchParams.get("customerId") || undefined;
    const dispenserId = searchParams.get("dispenserId") || undefined;

    const filters = {
      page,
      pageSize,
      q,
      startDate,
      endDate,
      controlledOnly,
      substitutionsOnly,
      customerId,
      dispenserId,
    };

    if (format === "csv") {
      const csvContent = await exportDispensingRegisterCsv(filters);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="dispensing-register-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const data = await getDispensingRegister(filters);
    return NextResponse.json({ ok: true, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load dispensing register.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
