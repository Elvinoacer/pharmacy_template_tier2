import styles from "@/app/components/location/PhoneLocationHandoff.module.css";

export default function LocationHandoffLoading() {
  return (
    <main className={styles.mobilePage}>
      <div className={styles.mobileShell}>
        <section className={styles.mobileHero}>
          <span className={styles.mobileEyebrow}>Secure location handoff</span>
          <h1>Opening your phone handoff…</h1>
          <p>Keep this page open. We are preparing the secure location request from your pharmacy onboarding session.</p>
        </section>
        <section className={styles.mobileCard} aria-busy="true">
          <div className={styles.precisionBox}>
            <div>
              <strong>Checking the one-time link</strong>
              <span>This should only take a moment.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
