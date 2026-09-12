import styles from "./OnboardSurface.module.css";

export const ONBOARD_STEPS = ["You", "Licence", "Place", "Review"] as const;

export default function OnboardStepper({ current }: { current: number }) {
  return (
    <ol className={styles.stepper} aria-label="Application progress">
      {ONBOARD_STEPS.map((label, index) => (
        <li
          key={label}
          className={styles.step}
          aria-current={index === current ? "step" : undefined}
          data-done={index < current ? "true" : undefined}
        >
          <i aria-hidden />
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}
