"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { ArrowRight, BadgeCheck, Check, MessageCircleMore, Search, ShieldCheck, ShoppingBag, Sparkles, Store, Stethoscope } from "lucide-react";
import styles from "./OnboardingValueStory.module.css";

const outcomes = [
  { icon: Search, title: "Discoverable catalogue", text: "Medicines become easier to browse." },
  { icon: ShoppingBag, title: "Structured requests", text: "Orders arrive in one workflow." },
  { icon: Stethoscope, title: "Visible services", text: "Show what your pharmacy can do." },
  { icon: MessageCircleMore, title: "Organised follow-ups", text: "Keep conversations in context." },
];

export default function OnboardingValueStory() {
  function scrollToApplication(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const target =
      document.querySelector<HTMLInputElement>('input[name="name"]')?.closest("form") ||
      document.querySelector<HTMLInputElement>('input[name="pharmacyId"]')?.closest("form");

    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <section className={styles.stage} aria-labelledby="value-story-title">
      <div className={styles.orbOne} aria-hidden />
      <div className={styles.orbTwo} aria-hidden />
      <div className={styles.copy}>
        <div className={styles.eyebrow}><Sparkles className="h-3.5 w-3.5" /> See what you are building</div>
        <h2 id="value-story-title" className={styles.title}>Not another listing. <span>A digital front door for your pharmacy.</span></h2>
        <p className={styles.lead}>Give people one clear place to discover your pharmacy, browse medicines and services, make requests and continue the conversation.</p>

        <div className={styles.outcomes}>
          {outcomes.map(({ icon: Icon, title, text }) => (
            <div className={styles.outcome} key={title}>
              <span><Icon className="h-4 w-4" /></span>
              <div><strong>{title}</strong><small>{text}</small></div>
            </div>
          ))}
        </div>

        <div className={styles.priceGlass}>
          <div>
            <small>After verification + activation</small>
            <div className={styles.price}><span>KES</span><strong>500</strong><em>/ month</em></div>
            <p>About KES 17/day for the platform service.</p>
          </div>
          <div className={styles.verifyPrice}>
            <ShieldCheck className="h-5 w-5" />
            <div><strong>KES 100 once</strong><small>Know Your Pharmacy review</small></div>
          </div>
        </div>
        <p className={styles.truth}><BadgeCheck className="h-4 w-4" /> Monthly billing starts only after verification, profile setup and service activation. Verification payment does not guarantee approval.</p>
        <div className={styles.actions}>
          <a href="/onboard" onClick={scrollToApplication}>Start with my pharmacy <ArrowRight className="h-4 w-4" /></a>
          <Link href="/for-pharmacies/walkthrough">Explore the walkthrough</Link>
        </div>
      </div>

      <div className={styles.scene} aria-label="Preview of a pharmacy storefront and operating activity">
        <div className={styles.preview}>
          <div className={styles.windowBar}><i /><i /><i /><span>aether.health/p/your-pharmacy</span></div>
          <div className={styles.storeHead}>
            <span><Store className="h-5 w-5" /></span>
            <div><strong>Your Pharmacy</strong><small><BadgeCheck className="h-3.5 w-3.5" /> Verified pharmacy</small></div>
            <em>Open</em>
          </div>
          <div className={styles.search}><Search className="h-4 w-4" /> Search medicines, services…</div>
          <div className={styles.previewGrid}>
            {outcomes.map(({ icon: Icon, title }, index) => <div key={title} style={{ animationDelay: `${index * 0.35}s` }}><Icon className="h-4 w-4" /><span>{title}</span></div>)}
          </div>
          <div className={styles.activity}>
            <p>Today at your pharmacy</p>
            <div><span><ShoppingBag className="h-3.5 w-3.5" /></span><div><strong>New medicine request</strong><small>Arrived 2 minutes ago</small></div></div>
            <div><span><MessageCircleMore className="h-3.5 w-3.5" /></span><div><strong>New follow-up message</strong><small>Conversation ready</small></div></div>
          </div>
        </div>
        <div className={styles.floatOne}><Check className="h-4 w-4" /><span><small>One patient journey</small><strong>Discover → request → follow up</strong></span></div>
        <div className={styles.floatTwo}><Sparkles className="h-4 w-4" /><span><small>Your storefront</small><strong>Available beyond the counter</strong></span></div>
      </div>
    </section>
  );
}
