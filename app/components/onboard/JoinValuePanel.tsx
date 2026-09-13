import { ShieldCheck } from "lucide-react";
import StorefrontPreview from "./StorefrontPreview";
import styles from "./OnboardSurface.module.css";

export default function JoinValuePanel() {
  return (
    <aside className={styles.value}>
      <p className={styles.kicker}>Your next chapter</p>
      <h1 className={styles.display}>A pharmacy{" "}<br /><em>they come back to.</em></h1>
      <div className={styles.joinPreview}><StorefrontPreview /><p className={styles.fieldHint}>Your future storefront · illustrative preview</p></div>
      <p className={styles.trust}><ShieldCheck size={16} aria-hidden /> Private until verified and published</p>
      <div className={styles.joinPrice}><span><strong>KES 100</strong> verification</span><span><strong>KES 500/mo</strong> on activation</span></div>
    </aside>
  );
}
