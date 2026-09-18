import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { getMedicationCalendarData, generateIcsCalendar } from "@/app/lib/services/medication-calendar";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user?.customerId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  // Check if requesting .ics export
  if (searchParams.get("export") === "ics" || searchParams.get("format") === "ics") {
    try {
      const ics = await generateIcsCalendar(user.customerId);
      return new Response(ics, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="afyvia-medications-${user.customerId.slice(0, 8)}.ics"`,
        },
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to generate calendar file" },
        { status: 500 },
      );
    }
  }

  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  const year = yearParam ? parseInt(yearParam, 10) : undefined;
  const month = monthParam ? parseInt(monthParam, 10) : undefined;

  const data = await getMedicationCalendarData(user.customerId, year, month);
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
