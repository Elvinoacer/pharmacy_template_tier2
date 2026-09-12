"use client";

import { useState } from "react";
import { CheckCircle2, Package, MessageSquare } from "lucide-react";
import StorefrontPreview from "./StorefrontPreview";
import styles from "./OnboardSurface.module.css";

const panels = ["Storefront", "Stock", "Requests"] as const;

export default function PharmacyDemo() {
  const [panel, setPanel] = useState<(typeof panels)[number]>("Storefront");
  const [ready, setReady] = useState(false);
  const [stock, setStock] = useState(12);

  return (
    <section className={styles.demo} aria-label="A look at your pharmacy on Aether">
      <header className={styles.demoHead}>
        <p>What patients and your team see</p>
        <h2>A front door that works after hours</h2>
      </header>
      <div role="tablist" aria-label="Demo areas" className={styles.tabs}>
        {panels.map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            role="tab"
            aria-selected={tab === panel}
            aria-controls="demo-panel"
            onClick={() => setPanel(tab)}
            className={`min-h-10 rounded-full px-3.5 text-sm font-semibold ${
              tab === panel ? "bg-[var(--brand)] text-white" : "bg-[var(--card-elev)] text-[var(--foreground)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div id="demo-panel" role="tabpanel" aria-labelledby={`tab-${panel}`} className="p-4 sm:p-6">
        {panel === "Storefront" ? <StorefrontPreview flush /> : null}
        {panel === "Stock" ? (
          <div>
            <Package className="h-6 w-6 text-[var(--brand)]" aria-hidden />
            <h3 className="mt-3 text-xl font-semibold tracking-tight">Patients see what’s available</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Your prices. Your stock. Updated when you say so.</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4">
              <div>
                <strong>Sample item</strong>
                <p role="status" className="mt-1 text-sm text-[var(--muted)]">
                  {stock > 0 ? `${stock} in stock` : "Out of stock"}
                </p>
              </div>
              <button
                className="btn-primary"
                onClick={() => setStock(stock ? 0 : 12)}
              >
                {stock ? "Mark out of stock" : "Restock"}
              </button>
            </div>
          </div>
        ) : null}
        {panel === "Requests" ? (
          <div>
            <MessageSquare className="h-6 w-6 text-[var(--brand)]" aria-hidden />
            <h3 className="mt-3 text-xl font-semibold tracking-tight">Every request has a next step</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">No lost WhatsApp. One list for the team.</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4">
              <div>
                <strong>Sample collection</strong>
                <p role="status" className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
                  {ready ? <CheckCircle2 className="h-4 w-4 text-[var(--brand)]" aria-hidden /> : null}
                  {ready ? "Ready for collection" : "Waiting"}
                </p>
              </div>
              <button className="btn-primary" onClick={() => setReady(!ready)}>
                {ready ? "Reset" : "Mark ready"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
