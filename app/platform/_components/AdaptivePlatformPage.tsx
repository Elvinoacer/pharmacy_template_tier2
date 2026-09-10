import styles from "./AdaptivePlatformSurface.module.css";

type Metric = {
  label: string;
  value: React.ReactNode;
  hint?: string;
};

type AdaptiveRow = {
  key: string;
  cells: React.ReactNode[];
};

type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClass: Record<StatusTone, string> = {
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  info: styles.badgeInfo,
  neutral: styles.badgeNeutral,
};

export function AdaptivePlatformPage({
  eyebrow = "Platform operations",
  title,
  description,
  metrics,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  metrics?: Metric[];
  children: React.ReactNode;
}) {
  return (
    <section className={styles.surface}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1
            className={styles.title}
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {title}
          </h1>
          <p className={styles.description}>{description}</p>
        </div>
      </header>

      {metrics?.length ? (
        <div className={styles.metrics} aria-label={`${title} summary`}>
          {metrics.map((metric) => (
            <article key={metric.label} className={styles.metricCard}>
              <p className={styles.metricLabel}>{metric.label}</p>
              <p className={styles.metricValue}>{metric.value}</p>
              {metric.hint ? <p className={styles.metricHint}>{metric.hint}</p> : null}
            </article>
          ))}
        </div>
      ) : null}

      {children}
    </section>
  );
}

export function PlatformSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      {title || description ? (
        <div className={styles.sectionHeader}>
          {title ? <h2 className={styles.sectionTitle}>{title}</h2> : null}
          {description ? <p className={styles.sectionDescription}>{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdaptiveDataTable({
  headers,
  rows,
  empty,
  primaryColumn = 0,
  minWidth,
}: {
  headers: string[];
  rows: AdaptiveRow[];
  empty: string;
  primaryColumn?: number;
  minWidth?: string;
}) {
  if (rows.length === 0) {
    return <div className={styles.empty}>{empty}</div>;
  }

  return (
    <>
      <div className={styles.mobileList}>
        {rows.map((row) => (
          <article key={row.key} className={styles.mobileCard}>
            <div className={styles.mobilePrimary}>
              <p className={styles.mobileLabel}>{headers[primaryColumn]}</p>
              <div className={styles.mobilePrimaryValue}>{row.cells[primaryColumn]}</div>
            </div>
            <dl className={styles.mobileGrid}>
              {headers.map((header, index) => {
                if (index === primaryColumn) return null;
                return (
                  <div key={`${row.key}-${header}`} className={styles.mobileField}>
                    <dt className={styles.mobileLabel}>{header}</dt>
                    <dd className={styles.mobileValue}>{row.cells[index]}</dd>
                  </div>
                );
              })}
            </dl>
          </article>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table} style={minWidth ? { minWidth } : undefined}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, index) => (
                  <td key={`${row.key}-${index}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  return <span className={`${styles.badge} ${toneClass[tone]}`}>{children}</span>;
}

export { styles as adaptivePlatformStyles };
