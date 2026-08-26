import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { getTenant } from "@/app/lib/tenant";
import { AdminShell } from "@/app/components/admin/AdminShell";
import StorefrontCustomizer from "@/app/components/admin/StorefrontCustomizer";

export const metadata: Metadata = { title: "Storefront studio" };

export const dynamic = "force-dynamic";

export default async function AdminStorefrontStudioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tenant = await getTenant();
  const slug = tenant.slug;

  let savedDoc: Record<string, unknown> = {};
  const basics = {
    tagline: "",
    about: "",
    logoUrl: "",
    coverImageUrl: "",
    deliveryNotes: "",
    deliveryFeeKes: "",
    deliveryRadiusKm: "",
    careersEmail: "",
  };

  try {
    const row = await prisma.pharmacySettings.findFirst({});
    if (row) {
      basics.tagline = row.tagline || "";
      basics.about = row.about || "";
      basics.logoUrl = row.logoUrl || "";
      basics.coverImageUrl = row.coverImageUrl || "";
      basics.deliveryNotes = row.deliveryNotes || "";
      basics.deliveryFeeKes = row.deliveryFeeKes != null ? String(row.deliveryFeeKes) : "";
      basics.deliveryRadiusKm = row.deliveryRadiusKm != null ? String(row.deliveryRadiusKm) : "";
      basics.careersEmail = row.careersEmail || "";
      const sf = row.storefront as unknown;
      if (sf && typeof sf === "object" && !Array.isArray(sf)) {
        savedDoc = sf as Record<string, unknown>;
      }
    }
  } catch (e) {
    console.error("[storefront-studio] load failed:", e);
  }

  return (
    <AdminShell
      user={user}
      title="Storefront studio"
      subtitle="Your room starts from the network template — personalise any part and every /p/* page updates."
    >
      <StorefrontCustomizer
        slug={slug}
        savedDoc={savedDoc}
        savedOverridesCount={Object.keys(savedDoc).length > 0}
        basics={basics}
      />
    </AdminShell>
  );
}
