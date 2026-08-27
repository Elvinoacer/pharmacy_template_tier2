import { NextResponse } from "next/server";
import { generateCsrfToken } from "@/app/lib/csrf";

export const runtime = "nodejs";

/**
 * Issue (or reuse) a CSRF token for double-submit protection on forms.
 * Route Handlers may set cookies; Server Components may not — so forms
 * fetch the token here before submitting mutating server actions.
 */
export async function GET() {
  try {
    const token = await generateCsrfToken();
    return NextResponse.json(
      { token },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (e) {
    console.error("[csrf]", e);
    return NextResponse.json({ error: "Could not issue CSRF token" }, { status: 500 });
  }
}
