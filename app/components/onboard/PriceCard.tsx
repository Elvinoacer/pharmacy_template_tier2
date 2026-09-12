import { Check } from "lucide-react";
import styles from "./OnboardSurface.module.css";

const included = ["Your storefront", "Catalogue & stock", "Patient requests", "Follow-ups"];

export default function PriceCard({ full = false }: { full?: boolean }) {
  return (
    <section className={`${styles.price} ${full ? styles.priceFull : ""}`} aria-label="Pharmacy pricing">
      <div>
        <small>After you go live</small>
        <div className={styles.amount}>
          <span>KES</span>
          <b>500</b>
          <em>/ month</em>
        </div>
        <p>About KES 17 a day. Nothing monthly until you launch.</p>
      </div>
      <div className={styles.verify}>
        <strong>KES 100</strong>
        <span>once, to verify the pharmacy</span>
      </div>
      {full ? (
        <ul className={styles.includes} style={{ gridColumn: "1 / -1" }}>
          {included.map((item) => (
            <li key={item}>
              <Check className="h-3.5 w-3.5" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
