import { BadgeCheck, Clock3, MessageCircle, Package, Search, Store, Stethoscope } from "lucide-react";
import styles from "./OnboardSurface.module.css";

const tiles = [
  { icon: Package, label: "Catalogue" },
  { icon: Clock3, label: "Refills" },
  { icon: Stethoscope, label: "Services" },
  { icon: MessageCircle, label: "Messages" },
] as const;

export default function StorefrontPreview({
  name = "Your pharmacy",
  city = "Nearby",
  flush = false,
}: {
  name?: string;
  city?: string;
  flush?: boolean;
}) {
  return (
    <div className={flush ? `${styles.device} ${styles.deviceFlush}` : styles.device}>
      <div className={styles.deviceGlow} aria-hidden />
      <div className={styles.bezel}>
        <div className={styles.screen}>
          <div className={styles.chrome} aria-hidden>
            <i />
            <i />
            <i />
            <em>aether.health/p/your-pharmacy</em>
          </div>

          <div className={styles.storeHead}>
            <span>
              <Store className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <strong>{name}</strong>
              <small>
                <BadgeCheck className="h-3 w-3" aria-hidden />
                Verified · Open today
              </small>
            </div>
            <b>{city}</b>
          </div>

          <div className={styles.search}>
            <Search className="h-3.5 w-3.5" aria-hidden />
            Search medicines and services
          </div>

          <div className={styles.tiles}>
            {tiles.map(({ icon: Icon, label }) => (
              <div key={label}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </div>
            ))}
          </div>

          <div className={styles.activity}>
            <p>Today</p>
            <div>
              <span>
                <Package className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <strong>New refill request</strong>
                <small>Arrived just now</small>
              </div>
            </div>
            <div>
              <span>
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div>
                <strong>Patient follow-up</strong>
                <small>Ready in your workspace</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
