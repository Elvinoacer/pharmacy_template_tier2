"use client";

import styles from "@/app/components/location/PhoneLocationHandoff.module.css";

export default function LocationHandoffError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.mobilePage}>
      <div className={styles.mobileShell}>
        <section className={styles.mobileHero}>
          <span className={styles.mobileEyebrow}>Secure location handoff</span>
          <h1>We could not open the handoff.</h1>
          <p>The QR page hit an unexpected error. Retry once; if the link has expired, return to the computer and generate a new QR code.</p>
        </section>
        <section className={styles.mobileCard}>
          <p className={styles.mobileError} role="alert">The secure phone page did not finish loading.</p>
          <button type="button" className={styles.mobileButton} onClick={reset}>Try again</button>
        </section>
      </div>
    </main>
  );
}
