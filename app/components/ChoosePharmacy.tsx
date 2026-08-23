import { listMarketplacePharmacies } from "@/app/lib/tenant";
import { platform } from "@/app/lib/data";
import PharmacyChooser from "./PharmacyChooser";

export default async function ChoosePharmacy({ next = "/" }: { next?: string }) {
  const pharmacies = await listMarketplacePharmacies();

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 pb-28 pt-28 sm:px-6 sm:pt-32">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0d6e5a]">{platform.name} network</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>
          Choose your pharmacy
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#5a6b62]">
          Browse the pharmacies available to you, find the nearest one, then continue with your request.
        </p>
      </div>
      <PharmacyChooser pharmacies={pharmacies} next={next} />
    </main>
  );
}
