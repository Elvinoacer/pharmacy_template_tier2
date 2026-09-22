import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { getTenant } from "@/app/lib/tenant";
import { AdminShell } from "@/app/components/admin/AdminShell";
import StorefrontCustomizer from "@/app/components/admin/StorefrontCustomizer";
import BasicStorefrontForm from "@/app/components/admin/BasicStorefrontForm";
import { PremiumFeatureNotice } from "@/app/components/admin/PremiumFeatureNotice";
import { Eye, LayoutTemplate, MousePointerClick } from "lucide-react";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";

export const metadata: Metadata = { title: "Storefront studio" };
export const dynamic = "force-dynamic";

export default async function AdminStorefrontStudioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const tenant = await getTenant();
  const slug = tenant.slug;
  const premiumActive = tenant.pharmacyId
    ? await hasPremiumPlan(tenant.pharmacyId)
    : false;
  let savedDoc: Record<string, unknown> = {};
  const basics = { tagline: "", about: "", logoUrl: "", coverImageUrl: "", deliveryNotes: "", deliveryFeeKes: "", deliveryRadiusKm: "", careersEmail: "" };

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
      if (sf && typeof sf === "object" && !Array.isArray(sf)) savedDoc = sf as Record<string, unknown>;
    }
  } catch (e) {
    console.error("[storefront-studio] load failed:", e);
  }

  const prioritySteps = [
    { icon: LayoutTemplate, step: "1", title: "Identity", hint: "Brand + basics" },
    { icon: Eye, step: "2", title: "Content", hint: "What patients see" },
    { icon: MousePointerClick, step: "3", title: "Convert", hint: "CTA + publish" },
  ];

  return (
    <AdminShell user={user} title="Website appearance" subtitle="Shape the public pharmacy experience with a mobile-first editing flow and clear publishing priority.">
      <div className="storefront-studio-ux mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
        {premiumActive ? (
          <>
            <section aria-label="Storefront editing priority" className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3 sm:grid-cols-3">
              {prioritySteps.map(({ icon: StepIcon, step, title, hint }) => (
                <div key={step} className="min-w-0 rounded-xl bg-[var(--admin-panel)] p-3">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] admin-soft"><StepIcon className="h-4 w-4 admin-accent-text" /> Step {step}</div>
                  <p className="mt-1 break-words text-base font-semibold admin-text">{title}</p>
                  <p className="mt-1 text-sm admin-muted">{hint}</p>
                </div>
              ))}
            </section>
            <StorefrontCustomizer slug={slug} savedDoc={savedDoc} savedOverridesCount={Object.keys(savedDoc).length > 0} basics={basics} />
          </>
        ) : (
          <>
            <PremiumFeatureNotice
              title="Free gets you online. Premium helps you stand out."
              description="Your basic pharmacy identity and delivery information remain editable on Free. Premium unlocks the full storefront studio: custom hero content, sections, team and gallery, FAQ, careers, social links, brand colours and conversion CTAs."
              benefits={["Advanced branding", "Custom home sections", "Gallery & team", "Conversion CTAs"]}
            />
            <BasicStorefrontForm
              slug={slug}
              basics={{
                tagline: basics.tagline,
                about: basics.about,
                logoUrl: basics.logoUrl,
                deliveryNotes: basics.deliveryNotes,
                deliveryFeeKes: basics.deliveryFeeKes,
                deliveryRadiusKm: basics.deliveryRadiusKm,
              }}
            />
          </>
        )}
        <style>{`
          .storefront-studio-ux {
            min-width: 0;
            overflow-wrap: anywhere;
          }

          .storefront-studio-ux form {
            min-width: 0;
          }

          .storefront-studio-ux form > div[class*="overflow-x-auto"] {
            scroll-snap-type: x proximity;
            overscroll-behavior-x: contain;
            scrollbar-width: thin;
          }

          .storefront-studio-ux form > div[class*="overflow-x-auto"] > button {
            min-height: 44px;
            scroll-snap-align: start;
          }

          .storefront-studio-ux :is(button, a) {
            min-height: 44px;
            min-width: 44px;
            font-size: 14px;
          }

          .storefront-studio-ux :is(input:not([type="hidden"]), textarea, select) {
            max-width: 100%;
            min-width: 0;
            font-size: 16px;
          }

          .storefront-studio-ux :is(input[type="checkbox"], input[type="radio"], input[type="color"]) {
            min-height: 44px;
            min-width: 44px;
          }

          .storefront-studio-ux :is(label, .label-admin) {
            font-size: 14px;
          }

          .storefront-studio-ux p {
            font-size: 16px;
            line-height: 1.5;
          }

          .storefront-studio-ux li {
            font-size: 14px;
          }

          .storefront-studio-ux p.truncate {
            overflow: visible;
            text-overflow: clip;
            white-space: normal;
            overflow-wrap: anywhere;
          }

          .storefront-studio-ux form > .admin-card:first-child {
            padding: 16px !important;
          }

          .storefront-studio-ux form > .admin-card:first-child > div:last-child {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 8px;
            width: 100%;
          }

          .storefront-studio-ux form > .admin-card:first-child > div:last-child :is(a, button) {
            width: 100%;
            justify-content: center;
          }

          .storefront-studio-ux [class*="flex items-start"] > .flex-1 {
            min-width: 0;
          }

          html[data-theme="dark"] .storefront-studio-ux [class*="text-red-200"] {
            color: #fda4af !important;
          }

          html[data-theme="dark"] .storefront-studio-ux [class*="text-emerald-200"] {
            color: #6ee7b7 !important;
          }

          html[data-theme="dark"] .storefront-studio-ux [class*="text-teal-700"] {
            color: #5eead4 !important;
          }

          @media (min-width: 640px) {
            .storefront-studio-ux :is(input:not([type="hidden"]), textarea, select),
            .storefront-studio-ux p {
              font-size: 14px;
            }

            .storefront-studio-ux form > .admin-card:first-child > div:last-child {
              display: flex;
              width: auto;
            }

            .storefront-studio-ux form > .admin-card:first-child > div:last-child :is(a, button) {
              width: auto;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
