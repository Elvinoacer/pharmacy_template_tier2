import { Check, ShieldCheck } from "lucide-react";
import styles from "./OnboardSurface.module.css";

const included = [
  "24/7 Digital storefront (/p/your-name)",
  "5 public medicine listings and 2 services",
  "Customer reservations and service bookings",
  "1,400+ Kenyan medicines with standard doses",
  "M-PESA Till & Paybill payouts",
  "Optional Premium: more listings, AI imports, analytics and POS sync",
];

export default function PriceCard({ full = false }: { full?: boolean }) {
  return (
    <section className={`${styles.price} ${full ? styles.priceFull : ""}`} aria-label="Pharmacy pricing">
      <div>
        <small>Free after verification</small>
        <div className={styles.amount}>
          <span>KES</span>
          <b>0</b>
          <em>/ month</em>
        </div>
        <p>Pay only KES 100 once for verification, or use a voucher. No monthly charge to launch.</p>
        <p style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "var(--brand)", fontWeight: 650 }}>
          Premium is KES 500/month when you need more than 5 medicine listings, 2 services or premium tools.
        </p>
      </div>

      <div className={styles.verify}>
        <strong>KES 100</strong>
        <span>one-time PPB check &amp; anti-clone lock</span>
        <span style={{ display: "block", marginTop: "0.2rem", fontSize: "0.62rem", color: "var(--brand)" }}>
          <ShieldCheck style={{ display: "inline", width: "0.75rem", height: "0.75rem", marginRight: "2px" }} />
          Verified premises badge
        </span>
      </div>

      {full ? (
        <div style={{ gridColumn: "1 / -1", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--line-2)" }}>
          <ul className={styles.includes}>
            {included.map((item) => (
              <li key={item}>
                <Check className="h-3.5 w-3.5" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
