import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PharmacyDemo from "@/app/components/onboard/PharmacyDemo";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

export const metadata = {
  title: "How pharmacies join",
  description: "From your name to a live storefront patients can use.",
};

const steps = [
  ["You", "Name the pharmacy. Verify email. Nothing is public yet.", "/onboard", "Create your pharmacy"],
  ["Licence", "PPB premises licence, pharmacist in charge, business evidence.", "/onboard/verification", "Open licence"],
  ["Place & fee", "Pin the premises. Pay KES 100 once — or use a waiver.", "/onboard/billing", "See fees"],
  ["Setup", "Hours, a few priced medicines, services, your look.", "/admin/setup", "Open setup"],
  ["Live", "Start KES 500 / month. Publish when you’re ready.", "/admin/setup", "Go live"],
] as const;

export default function Walkthrough() {
  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <Link href="/for-pharmacies" className={styles.quietLink}>
          For pharmacies
        </Link>
        <p className={`${styles.kicker} mt-6`}>The path</p>
        <h1 className={styles.display} style={{ maxWidth: "16ch" }}>
          From join
          <em>to first patient.</em>
        </h1>
        <p className={styles.lead}>Five quiet steps. You can leave and come back.</p>

        <div className="mt-10 max-w-3xl">
          <PharmacyDemo />
        </div>

        <ol className="mx-auto mt-12 max-w-3xl">
          {steps.map(([title, description, href, cta], i) => (
            <li key={title} className={styles.walkStep}>
              <span className={styles.walkIndex}>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
                <Link href={href} className={`${styles.quietLink} mt-3`}>
                  {cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
