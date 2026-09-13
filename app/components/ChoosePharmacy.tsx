import { getSessionUser } from "@/app/lib/auth";
import CareHero from "./care/CareHero";
import CareIntentNavigator, { type CareIntent } from "./care/CareIntentNavigator";
import styles from "./care/CarePages.module.css";

function intentFromNext(next: string): CareIntent | undefined {
  if (next.startsWith("/prescription")) return "prescription";
  if (next.startsWith("/refill")) return "refill";
  if (
    next.startsWith("/services") ||
    next.startsWith("/screenings") ||
    next.startsWith("/vaccinations") ||
    next.startsWith("/preventive")
  )
    return "service";
  if (
    next.startsWith("/medicines") ||
    next.startsWith("/order") ||
    next.startsWith("/delivery") ||
    next.startsWith("/search")
  )
    return "medicine";
  return undefined;
}

function queryFromNext(next: string) {
  if (next.startsWith("/vaccinations")) return "vaccination";
  if (next.startsWith("/screenings")) return "screening";
  if (next.startsWith("/preventive")) return "preventive care";
  if (next.startsWith("/delivery")) return "delivery";
  return "";
}

/**
 * Compatibility entry for legacy storefront-dependent routes.
 *
 * This deliberately does not ask the customer to choose a pharmacy. It keeps
 * their original intent and returns them to network-wide discovery; a pharmacy
 * is introduced later by the medicine/service that can actually fulfil it.
 */
export default async function ChoosePharmacy({
  next = "/",
  title,
  description,
}: {
  next?: string;
  title?: string;
  description?: string;
}) {
  const session = await getSessionUser().catch(() => null);
  const initialIntent = intentFromNext(next);
  const initialQuery = queryFromNext(next);
  const neutralTitle =
    title && !/pharmac(y|ies)/i.test(title) ? title : "What brings you today?";
  const neutralDescription =
    description && !/pharmac(y|ies)/i.test(description)
      ? description
      : "Start with the medicine, prescription or service you need. We’ll connect the pharmacy only after we know what can help you.";

  return (
    <div className={styles.page}>
      <CareHero
        section={initialIntent === "service" ? "services" : "medicines"}
        eyebrow="START WITH YOUR NEED"
        title="Tell us what you need."
        accent="We’ll guide the rest."
        description="You do not need to pick a pharmacy before you can explore care. Search first, compare availability, then continue with the provider that can fulfil your need."
      />
      <CareIntentNavigator
        signedIn={Boolean(session?.customerId)}
        initialIntent={initialIntent}
        initialQuery={initialQuery}
        title={neutralTitle}
        description={neutralDescription}
      />
    </div>
  );
}
