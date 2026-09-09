import styles from "./ServicesPage.module.css";

export default function Loading() {
  return (
    <div className={styles.loadingPage} aria-busy="true" aria-label="Loading services">
      <div className={styles.loadingWrap}>
        <div className={`${styles.loadingHero} ${styles.skeleton}`} />
        <div className={`${styles.loadingHeading} ${styles.skeleton}`} />
        <div className={styles.loadingGrid}>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className={`${styles.loadingCard} ${styles.skeleton}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
