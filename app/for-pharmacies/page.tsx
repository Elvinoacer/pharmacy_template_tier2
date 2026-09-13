import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Store, WalletCards } from "lucide-react";
import PharmacyDemo from "@/app/components/onboard/PharmacyDemo";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

export const metadata = {
  title: "For pharmacies",
  description: "Your online storefront, refill requests and patient follow-up. KES 100 verification, then KES 500/month when you start service.",
};

export default function ForPharmaciesPage() {
  return (
    <div className={`${styles.page} ${styles.landing}`}>
      <div className={styles.frame}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}><Store size={15} aria-hidden /> Aether for pharmacies</p>
            <h1 className={styles.heroTitle}>Your pharmacy.<br /><em>More connected.</em></h1>
            <p className={styles.lead}>Get found nearby. Manage requests. Keep patients coming back.</p>
            <div className={styles.heroActions}>
              <Link href="/onboard" className="btn-primary">Create your pharmacy <ArrowRight size={17} aria-hidden /></Link>
              <a href="#pricing" className={styles.quietLink}>Simple, upfront pricing <ArrowRight size={15} aria-hidden /></a>
            </div>
            <p className={styles.trust}><ShieldCheck size={16} aria-hidden /> Private until verified and published.</p>
            <div className={styles.outcomes}>
              {[['01', 'Get discovered', 'Your own online storefront'], ['02', 'Stay organised', 'One place for patient requests'], ['03', 'Bring patients back', 'Refills and follow-up']].map(([number, title, detail]) => (
                <div key={number}><small>{number}</small><strong>{title}</strong><span>{detail}</span></div>
              ))}
            </div>
          </div>
          <div className={styles.heroDemo}>
            <div className={styles.demoCaption}><span className={styles.liveDot} /> Explore your future workspace <span>Interactive demo</span></div>
            <PharmacyDemo />
            <p className={styles.fieldHint}>Illustrative preview · try the tabs and sample request.</p>
          </div>
        </section>
        <section id="pricing" className={styles.offer}>
          <div><p className={styles.kicker}><WalletCards size={15} aria-hidden /> One simple plan</p><h2>Small cost.<br />A new front door.</h2><p>Storefront, catalogue, requests and follow-up.</p></div>
          <div className={styles.offerPrice}><span>ONE TIME</span><strong><small>KES</small> 100</strong><p>Pharmacy verification</p></div>
          <div className={styles.offerPrice}><span>WHEN YOU START SERVICE</span><strong><small>KES</small> 500<small> /mo</small></strong><p>Complete your profile before activating.</p></div>
        </section>
        <section className={styles.launchPath} aria-label="Your path to launch">
          {['Create account', 'Submit licence', 'Pay verification fee', 'Set up & launch'].map((label, i) => <div key={label}><span>{String(i + 1).padStart(2, '0')}</span><strong>{label}</strong>{i < 3 ? <ArrowRight size={16} aria-hidden /> : <Check size={16} aria-hidden />}</div>)}
        </section>
        <div className={styles.closing}><div><h2>Ready for your next patient?</h2><p>Start with your name. Build from there.</p></div><Link href="/onboard" className="btn-primary">Get started <ArrowRight size={17} aria-hidden /></Link></div>
      </div>
    </div>
  );
}
