import { CheckCircle2, HeartPulse, Search, Workflow } from "lucide-react";
import StorefrontPreview from "./StorefrontPreview";
import PriceCard from "./PriceCard";
import styles from "./OnboardSurface.module.css";

const benefits = [
  { icon: Search, title: "Found nearby", text: "A real storefront, not a pin on a map." },
  { icon: Workflow, title: "One workspace", text: "Requests land in order — not WhatsApp." },
  { icon: HeartPulse, title: "Patients stay", text: "Refills that remember them." },
] as const;

export default function JoinValuePanel() {
  return (
    <aside className={styles.value}>
      <p className={styles.kicker}>Aether for pharmacies</p>
      <h1 className={styles.display}>
        Be the pharmacy they find.
        <em>And stay with.</em>
      </h1>
      <p className={styles.lead}>A storefront patients can use. Requests your team can run. Follow-up that keeps them yours.</p>

      <StorefrontPreview />
      <PriceCard />

      <ul className={styles.benefits}>
        {benefits.map(({ icon: Icon, title, text }) => (
          <li key={title} className={styles.benefit}>
            <span>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <strong>{title}</strong>
              <small>{text}</small>
            </div>
          </li>
        ))}
      </ul>

      <p className={styles.trust}>
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        Verified before anyone can see you
      </p>
    </aside>
  );
}
