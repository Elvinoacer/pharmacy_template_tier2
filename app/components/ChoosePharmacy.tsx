import { headers } from "next/headers";
import { ArrowRight, Route } from "lucide-react";
import { listMarketplacePharmacies } from "@/app/lib/tenant";
import { platform } from "@/app/lib/data";
import PharmacyChooser from "./PharmacyChooser";

function destinationLabel(next: string) {
  const path = next.split("?")[0];
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "pharmacy storefront";
  const labels: Record<string, string> = {
    medicines: "medicines",
    services: "services",
    refill: "prescription refill",
    order: "order",
    search: "search",
    preventive: "preventive care",
    screenings: "health screenings",
    vaccinations: "vaccinations",
    delivery: "delivery",
    faq: "FAQ",
    careers: "careers",
    contact: "contact",
  };
  return labels[segments[0]] ?? segments.join(" ").replace(/-/g, " ");
}

function preservedDestination(next: string, returnPath: string | null) {
  if (!returnPath || !returnPath.startsWith("/") || returnPath.startsWith("//") || returnPath.startsWith("/p/")) {
    return next;
  }

  const [currentPath, rawQuery = ""] = returnPath.split("?", 2);
  const expectedPath = next.split("?")[0];
  if (currentPath !== expectedPath) return next;

  const params = new URLSearchParams(rawQuery);
  // This flag exists only to reopen the chooser. Carrying it into the
  // selected tenant URL would immediately reopen the chooser on pages such as
  // /refill, so remove it while preserving real user intent (q, category,
  // medicationId, page, etc.).
  params.delete("changePharmacy");
  const query = params.toString();
  return query ? `${currentPath}?${query}` : currentPath;
}

export default async function ChoosePharmacy({
  next = "/",
  title,
  description,
}: {
  next?: string;
  title?: string;
  description?: string;
}) {
  const [pharmacies, requestHeaders] = await Promise.all([
    listMarketplacePharmacies(),
    headers().catch(() => null),
  ]);
  const effectiveNext = preservedDestination(next, requestHeaders?.get("x-return-path") ?? null);
  const destination = destinationLabel(effectiveNext);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] px-3 pb-20 pt-24 text-[var(--foreground)] transition-colors duration-300 sm:px-6 sm:pb-24 sm:pt-32">
      <div className="mx-auto mb-6 max-w-3xl text-center sm:mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">
          {platform.name} network
        </p>
        <h1
          className="mt-2 text-[clamp(1.8rem,8vw,2.6rem)] font-semibold leading-[1.05] tracking-tight text-[var(--foreground)] sm:mt-3"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {title ?? "Choose your pharmacy"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[13px] leading-6 text-[var(--muted)] sm:text-sm">
          {description ?? "Choose the pharmacy you want to use. We’ll open the exact page you were trying to reach immediately after selection."}
        </p>

        <div className="mx-auto mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3 py-2 text-[11px] font-semibold text-[var(--muted)] shadow-sm sm:text-xs">
          <Route className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          <span className="truncate">Next: {destination}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
        </div>
      </div>
      <PharmacyChooser pharmacies={pharmacies} next={effectiveNext} />
    </main>
  );
}
