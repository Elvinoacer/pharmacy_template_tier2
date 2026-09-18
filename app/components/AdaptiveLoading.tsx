import styles from "./AdaptiveLoading.module.css";

type AdaptiveLoadingProps = {
  label?: string;
  variant?: "public" | "workspace" | "admin";
  cards?: number;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
};

export default function AdaptiveLoading({
  label = "Loading page",
  variant = "public",
  cards = 6,
  title,
  subtitle,
  eyebrow,
}: AdaptiveLoadingProps) {
  const cardCount = Math.max(3, Math.min(cards, 8));
  const variantClass =
    variant === "admin" ? styles.admin : variant === "workspace" ? styles.workspace : styles.public;

  const accessibleLabel = title ? `${title} · ${subtitle || label}` : label;

  return (
    <div
      className={`${styles.surface} ${variantClass}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={accessibleLabel}
    >
      <div className={styles.wrap}>
        <div className={styles.heading}>
          {title ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-accent-text,#0d6e5a)]">
                {eyebrow || "Afyvia Workspace"}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--admin-text,#0c1a14)]">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm text-[var(--admin-text-muted,#465e53)]">
                  {subtitle}
                </p>
              )}
            </div>
          ) : (
            <div aria-hidden="true">
              <div className={`${styles.skeleton} ${styles.eyebrow}`} />
              <div className={`${styles.skeleton} ${styles.title}`} />
              <div className={`${styles.skeleton} ${styles.copy}`} />
            </div>
          )}
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
      <span className="sr-only">{accessibleLabel}</span>
    </div>
  );
}
