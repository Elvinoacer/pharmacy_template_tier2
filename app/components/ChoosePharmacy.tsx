import { listMarketplacePharmacies } from "@/app/lib/tenant";
import { platform } from "@/app/lib/data";
import PharmacyChooser from "./PharmacyChooser";

export default async function ChoosePharmacy({
  next = "/",
  title,
  description,
}: {
  next?: string;
  title?: string;
  description?: string;
}) {
  const pharmacies = await listMarketplacePharmacies();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] px-3 pb-20 pt-24 text-[var(--foreground)] transition-colors duration-300 sm:px-6 sm:pb-24 sm:pt-32">
      <div className="mx-auto mb-6 max-w-3xl text-center sm:mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">{platform.name} network</p>
        <h1 className="mt-2 text-[clamp(1.8rem,8vw,2.6rem)] font-semibold leading-[1.05] tracking-tight text-[var(--foreground)] sm:mt-3" style={{ fontFamily: "var(--font-display), serif" }}>
          {title ?? "Choose your pharmacy"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[13px] leading-6 text-[var(--muted)] sm:text-sm">
          {description ?? "Browse the pharmacies available to you, find the nearest one, then continue with your request."}
        </p>
      </div>
      <PharmacyChooser pharmacies={pharmacies} next={next} />
    </main>
  );
}
