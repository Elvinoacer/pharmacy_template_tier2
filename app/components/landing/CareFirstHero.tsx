import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileUp,
  HeartPulse,
  Pill,
  RotateCw,
  Search,
} from "lucide-react";
import glass from "../care/LiquidGlass.module.css";
import styles from "./CareFirstHero.module.css";

export default function CareFirstHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.topline}>
        <span>
          <i /> A LITTLE CLOSER TO FEELING BETTER
        </span>
        <Link href="/about">
          Care, connected <ArrowUpRight size={14} aria-hidden />
        </Link>
      </div>
      <div className={styles.scene}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>YOUR HEALTH. YOUR NEXT STEP.</p>
          <h1>
            Find what you need.
            <br />
            <em>Feel cared for.</em>
          </h1>
          <p className={styles.intro}>
            Your medicines. Your refills. Your everyday care.
            <br className={styles.desktopBreak} /> Discover what’s available,
            all in one place.
          </p>
          <form
            action="/medicines"
            method="GET"
            className={styles.search}
            role="search"
          >
            <Search size={21} aria-hidden />
            <div>
              <label htmlFor="care-medicine">What can we help you find?</label>
              <input
                id="care-medicine"
                name="q"
                type="search"
                placeholder="Medicine name, brand or generic"
              />
            </div>
            <button type="submit" aria-label="Search medicines">
              <ArrowRight size={21} aria-hidden />
            </button>
          </form>
          <div className={styles.searchFoot}>
            <span>
              <Check size={13} aria-hidden /> No account needed to explore
            </span>
            <Link href="/medicines">
              Browse medicines <ArrowUpRight size={13} aria-hidden />
            </Link>
          </div>
        </div>
        <div className={styles.photo}>
          <Image
            src="/images/care/editorial-pharmacy.png"
            alt="Illustrative scene of a pharmacist helping a customer"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 58vw"
          />
          <div className={styles.photoShade} />
          <div className={styles.floatingNote}>
            <span className={styles.roundIcon}>
              <HeartPulse size={23} aria-hidden />
            </span>
            <div>
              <span>CARE STARTS WITH A CONNECTION</span>
              <strong>
                A more human way
                <br />
                to find your care.
              </strong>
            </div>
            <ArrowUpRight size={20} aria-hidden />
          </div>
          <span className={styles.credit}>Illustrative imagery</span>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-2xl text-center md:mt-14">
        <p className="text-[9px] font-extrabold tracking-[.16em] text-[var(--brand)]">
          WHAT BRINGS YOU TODAY?
        </p>
        <h2
          className="mt-2 text-3xl leading-tight tracking-[-.035em] md:text-4xl"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Start with your need. <em className="font-normal text-[var(--brand)]">Not a pharmacy.</em>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-[var(--muted)]">
          We’ll connect availability to the pharmacy that can actually help after we know what you need.
        </p>
      </div>

      <div className={styles.paths}>
        <Link className={glass.liquid} href="/prescription">
          <span className={styles.pathIcon}>
            <FileUp size={23} aria-hidden />
          </span>
          <div>
            <span className={styles.pathKicker}>HAVE A PRESCRIPTION?</span>
            <h2>Let’s find your medicines.</h2>
            <p>Upload a photo. Review the names. See what’s available.</p>
          </div>
          <ArrowUpRight className={styles.pathArrow} size={23} aria-hidden />
        </Link>
        <Link className={glass.liquid} href="/refill">
          <span className={styles.pathIcon}>
            <RotateCw size={23} aria-hidden />
          </span>
          <div>
            <span className={styles.pathKicker}>KEEP YOUR CARE GOING</span>
            <h2>Time for a refill?</h2>
            <p>Start with the medicine you need. We’ll check availability.</p>
          </div>
          <ArrowUpRight className={styles.pathArrow} size={23} aria-hidden />
        </Link>
        <Link className={glass.liquid} href="/services">
          <span className={styles.pathIcon}>
            <HeartPulse size={23} aria-hidden />
          </span>
          <div>
            <span className={styles.pathKicker}>MORE WAYS TO FEEL WELL</span>
            <h2>Care beyond the counter.</h2>
            <p>Explore screenings, vaccinations, and everyday services.</p>
          </div>
          <ArrowUpRight className={styles.pathArrow} size={23} aria-hidden />
        </Link>
      </div>
      <div className={`${styles.note} flex-wrap`}>
        <Pill size={16} aria-hidden />
        <span>
          Start with what you need. Availability connects your request to the
          pharmacy that can help.
        </span>
        <span aria-hidden>·</span>
        <Link href="/pharmacies" className="font-semibold text-[var(--brand)]">
          Looking for a specific pharmacy? Browse the directory.
        </Link>
      </div>
    </section>
  );
}
