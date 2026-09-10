import { Check, Layers3 } from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage } from "@/app/platform/_components/PlatformPage";
import { ensureDefaultPlans } from "@/app/lib/platform/billing";

export const metadata = { title: "Plans" };
export const dynamic = "force-dynamic";

export default async function PlansPage() {
  await ensureDefaultPlans().catch(() => {});
  const plans = await prismaUnscoped.plan
    .findMany({
      orderBy: { sortOrder: "asc" },
      include: { features: true },
    })
    .catch(() => []);

  return (
    <PlatformPage
      title="Plans"
      description="Review pricing and entitlements attached to each SaaS plan. The layout is optimized for quick comparison on narrow and wide screens."
    >
      {plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cfdcd4] bg-white px-4 py-12 text-center dark:border-white/15 dark:bg-white/[0.025]">
          <Layers3 className="mx-auto h-6 w-6 text-[#7d8b83] dark:text-teal-100/45" aria-hidden />
          <p className="mt-3 text-sm text-[#68776e] dark:text-teal-100/65">No plans.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan, index) => (
            <article
              key={plan.id}
              className="group flex min-w-0 flex-col rounded-3xl border border-[#dce7e1] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none dark:hover:border-teal-200/20 dark:hover:bg-white/[0.05] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-200/70">
                    Plan {index + 1}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-[#17231d] dark:text-white">
                    {plan.name}
                  </h2>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-300/10 dark:text-teal-200">
                  <Layers3 className="h-4 w-4" aria-hidden />
                </span>
              </div>

              <div className="mt-5 flex items-end gap-1.5">
                <span className="text-2xl font-semibold tracking-tight text-[#132019] dark:text-white sm:text-3xl">
                  KES {Number(plan.priceKes).toLocaleString("en-KE")}
                </span>
                <span className="pb-1 text-xs text-[#718078] dark:text-teal-100/55">/ {plan.interval}</span>
              </div>

              <div className="mt-4 border-t border-[#edf2ef] pt-4 dark:border-white/8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#718078] dark:text-teal-100/50">
                  {plan.features.length} entitlement{plan.features.length === 1 ? "" : "s"}
                </p>
                {plan.features.length ? (
                  <ul className="mt-3 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature.id} className="flex min-w-0 items-start gap-2 text-sm text-[#35453c] dark:text-teal-50/85">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                        <span className="min-w-0 break-words">
                          {feature.key}
                          {feature.limitInt != null ? (
                            <span className="ml-1 text-xs text-[#75837a] dark:text-teal-100/50">
                              ({feature.limitInt})
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-[#89958e] dark:text-teal-100/45">No explicit entitlements.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </PlatformPage>
  );
}
