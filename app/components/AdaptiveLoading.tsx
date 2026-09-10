import styles from "./AdaptiveLoading.module.css";

type AdaptiveLoadingProps = {
  label?: string;
  variant?: "public" | "workspace";
  cards?: number;
};

export default function AdaptiveLoading({
  label = "Loading page",
  variant = "public",
  cards = 6,
}: AdaptiveLoadingProps) {
  const cardCount = Math.max(3, Math.min(cards, 8));

  return (
    <div
      className={`${styles.surface} ${variant === "workspace" ? styles.workspace : styles.public}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className={styles.wrap}>
        <div className={styles.heading} aria-hidden="true">
          <div className={`${styles.skeleton} ${styles.eyebrow}`} />
          <div className={`${styles.skeleton} ${styles.title}`} />
          <div className={`${styles.skeleton} ${styles.copy}`} />
        </div>

        <div className={styles.stats} aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={styles.statCard}>
              <div className={`${styles.skeleton} ${styles.statLabel}`} />
              <div className={`${styles.skeleton} ${styles.statValue}`} />
            </div>
          ))}
        </div>

        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: cardCount }, (_, index) => (
            <div key={index} className={styles.card}>
              <div className={`${styles.skeleton} ${styles.cardMedia}`} />
              <div className={styles.cardBody}>
                <div className={`${styles.skeleton} ${styles.cardTitle}`} />
                <div className={`${styles.skeleton} ${styles.cardLine}`} />
                <div className={`${styles.skeleton} ${styles.cardLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
