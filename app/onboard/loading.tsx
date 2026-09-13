import styles from "@/app/components/onboard/OnboardSurface.module.css";

export default function Loading() {
  return <div className={styles.narrow} role="status" aria-live="polite">
    <div className={styles.form} aria-busy="true">
      <p className={styles.kicker}>Opening your next step…</p>
      <div className="mt-6 space-y-4" aria-hidden="true">
        <div className="h-7 w-2/3 rounded-lg bg-[var(--brand-soft)]" />
        <div className="h-12 rounded-xl bg-[var(--surface)]" />
        <div className="h-12 rounded-xl bg-[var(--surface)]" />
        <div className="h-12 rounded-xl bg-[var(--surface)]" />
      </div>
    </div>
  </div>;
}
