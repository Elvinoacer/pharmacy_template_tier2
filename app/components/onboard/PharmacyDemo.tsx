"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  MessageSquare,
  Minus,
  Package,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import StorefrontPreview from "./StorefrontPreview";
import styles from "./OnboardSurface.module.css";

const panels = ["Storefront", "Live Stock", "Refill Queue"] as const;

type StockItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
};

type RequestItem = {
  id: string;
  patient: string;
  phone: string;
  medicine: string;
  amount: number;
  time: string;
  type: "refill" | "prescription" | "urgent";
  status: "pending" | "stk_sent" | "paid" | "ready" | "dispatched";
};

const INITIAL_STOCK: StockItem[] = [
  { id: "1", name: "Amoxicillin 500mg (30 caps)", category: "Antibiotics", price: 450, stock: 24 },
  { id: "2", name: "Metformin 500mg (100 tabs)", category: "Chronic / Diabetes", price: 350, stock: 15 },
  { id: "3", name: "Augmentin 625mg (14 tabs)", category: "Antibiotics", price: 1400, stock: 8 },
  { id: "4", name: "Salbutamol 100mcg Inhaler", category: "Respiratory", price: 750, stock: 4 },
  { id: "5", name: "Panadol Extra (100 tabs)", category: "Pain relief", price: 650, stock: 42 },
];

const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: "REQ-101",
    patient: "Grace Wanjiku",
    phone: "0722***819",
    medicine: "Amlodipine 5mg (30 tabs) · Chronic Refill",
    amount: 950,
    time: "2 mins ago",
    type: "refill",
    status: "pending",
  },
  {
    id: "REQ-102",
    patient: "David Omondi",
    phone: "0712***456",
    medicine: "Augmentin 625mg · Dr. Kamau Rx",
    amount: 1400,
    time: "8 mins ago",
    type: "prescription",
    status: "paid",
  },
  {
    id: "REQ-103",
    patient: "Sarah Nyambura",
    phone: "0733***112",
    medicine: "Ventolin Inhaler · Late-night Urgent",
    amount: 750,
    time: "14 mins ago",
    type: "urgent",
    status: "ready",
  },
];

export default function PharmacyDemo() {
  const [panel, setPanel] = useState<(typeof panels)[number]>("Storefront");
  const [stockItems, setStockItems] = useState<StockItem[]>(INITIAL_STOCK);
  const [requests, setRequests] = useState<RequestItem[]>(INITIAL_REQUESTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const adjustStock = (id: string, delta: number) => {
    setStockItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item))
    );
    triggerToast("Live stock updated across /p/your-pharmacy (synced in 45ms)");
  };

  const toggleAvailability = (id: string) => {
    setStockItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stock: item.stock > 0 ? 0 : 20 } : item))
    );
    triggerToast("Item public availability toggled");
  };

  const advanceRequest = (id: string) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== id) return req;
        if (req.status === "pending") {
          triggerToast(`⚡ STK Push of KES ${req.amount} sent to ${req.phone}`);
          return { ...req, status: "stk_sent" };
        }
        if (req.status === "stk_sent") {
          triggerToast(`✓ M-PESA payment of KES ${req.amount} confirmed by Safaricom!`);
          return { ...req, status: "paid" };
        }
        if (req.status === "paid") {
          triggerToast("Package verified and marked ready for pickup / rider");
          return { ...req, status: "ready" };
        }
        if (req.status === "ready") {
          triggerToast("Order dispatched via Boda! Tracking sent to patient.");
          return { ...req, status: "dispatched" };
        }
        return req;
      })
    );
  };

  const filteredStock = stockItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className={styles.demo} aria-label="Interactive pharmacy workspace demo">
      {/* Demo Header */}
      <header className={styles.demoHead}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200 border border-emerald-400/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Workspace
            </span>
            <h2 className="text-xs sm:text-sm font-semibold text-white truncate">
              A front door that works 24/7
            </h2>
          </div>
          <span className="text-[11px] text-emerald-200/80 font-medium shrink-0 flex items-center gap-1">
            <Sparkles size={11} className="text-emerald-300" aria-hidden /> Interactive
          </span>
        </div>
      </header>

      {/* Tabs navigation: Storefront | Live Stock | Refill Queue */}
      <div role="tablist" aria-label="Demo workspace areas" className={styles.tabs}>
        {panels.map((tab) => {
          const isActive = tab === panel;
          return (
            <button
              key={tab}
              id={`tab-${tab}`}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(event) => {
                const index = panels.indexOf(tab);
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % panels.length
                    : event.key === "ArrowLeft"
                      ? (index + panels.length - 1) % panels.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? panels.length - 1
                          : null;
                if (next === null) return;
                event.preventDefault();
                setPanel(panels[next]);
                document.getElementById(`tab-${panels[next]}`)?.focus();
              }}
              aria-selected={isActive}
              aria-controls="demo-panel"
              onClick={() => setPanel(tab)}
              className={`min-h-7 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                isActive
                  ? "bg-[var(--brand)] text-[var(--background)] shadow-sm ring-2 ring-[var(--brand)] ring-offset-1 ring-offset-[var(--background)]"
                  : "bg-[var(--card-elev)] text-[var(--foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
              }`}
            >
              {tab === "Storefront" && <Store className="mr-1 inline h-3 w-3" aria-hidden />}
              {tab === "Live Stock" && <Package className="mr-1 inline h-3 w-3" aria-hidden />}
              {tab === "Refill Queue" && <MessageSquare className="mr-1 inline h-3 w-3" aria-hidden />}
              {tab}
            </button>
          );
        })}
      </div>

      {/* Live Workspace Toast */}
      {notification && (
        <aside
          className="mx-3 mt-2 rounded-xl bg-emerald-950 px-3 py-1.5 text-xs text-emerald-200 shadow-md border border-emerald-800/60 flex items-center justify-between animate-fadeIn"
          role="status"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <span className="text-[9px] uppercase font-bold text-emerald-400/80">Real-time sync</span>
        </aside>
      )}

      {/* Tab Panel Content */}
      <div
        key={panel}
        tabIndex={0}
        id="demo-panel"
        role="tabpanel"
        aria-labelledby={`tab-${panel}`}
        className={`${styles.routeEnter} p-2 sm:p-2.5`}
      >
        {/* PANEL 1: STOREFRONT */}
        {panel === "Storefront" ? (
          <div>
            <StorefrontPreview flush mode="video-demo" defaultAutoPlay={true} showControls={true} />
          </div>
        ) : null}

        {/* PANEL 2: LIVE STOCK */}
        {panel === "Live Stock" ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
                  Live Stock (1,400+ Kenyan medicines)
                </h3>
                <p className="text-[11px] text-[var(--muted)]">
                  Tap + or - to test instant updates across patients searching nearby:
                </p>
              </div>
              <div className="relative min-w-[160px]">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] bg-[var(--card)] py-1 pl-7 pr-2.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_28%,transparent)]"
                />
              </div>
            </div>

            {/* Stock table */}
            <div className="space-y-1.5">
              {filteredStock.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] bg-[var(--card)] p-2 sm:p-2.5 shadow-sm transition-all hover:border-[var(--brand)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-semibold">{item.name}</strong>
                      <span className="rounded-full bg-[var(--brand-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand)]">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--muted)]">
                      KES {item.price} ·{" "}
                      <span className={item.stock > 0 ? "text-emerald-700 dark:text-emerald-300 font-semibold" : "text-rose-700 dark:text-rose-300 font-bold"}>
                        {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5 rounded border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--card-elev)] p-0.5">
                      <button
                        type="button"
                        onClick={() => adjustStock(item.id, -1)}
                        className="grid h-5 w-5 place-items-center rounded bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--brand-soft)] active:scale-95 transition-transform"
                        title="Reduce stock"
                        aria-label={`Reduce stock for ${item.name}`}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.stock}</span>
                      <button
                        type="button"
                        onClick={() => adjustStock(item.id, 5)}
                        className="grid h-5 w-5 place-items-center rounded bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--brand-soft)] active:scale-95 transition-transform"
                        title="Add 5 units"
                        aria-label={`Add 5 units for ${item.name}`}
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleAvailability(item.id)}
                      className="rounded border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] px-2 py-0.5 text-[10px] font-semibold hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] active:scale-95 transition-all"
                    >
                      {item.stock > 0 ? "Out" : "Restock"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between rounded-lg bg-[var(--brand-soft)] p-2 text-[11px] text-[var(--brand-deep)]">
              <span className="flex items-center gap-1 font-medium">
                <CheckCircle2 size={12} className="text-[var(--brand)] shrink-0" />
                Changes sync to nearby patients in 50ms.
              </span>
              <button
                type="button"
                onClick={() => {
                  setStockItems(INITIAL_STOCK);
                  triggerToast("Inventory reset to defaults");
                }}
                className="font-bold underline text-[10px]"
              >
                Reset
              </button>
            </div>
          </div>
        ) : null}

        {/* PANEL 3: REFILL QUEUE */}
        {panel === "Refill Queue" ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
                  Patient Refill Queue
                </h3>
                <p className="text-[11px] text-[var(--muted)]">
                  Click any action button to simulate order progression:
                </p>
              </div>
              <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--brand)]">
                {requests.filter((r) => r.status !== "dispatched").length} Active
              </span>
            </div>

            <div className="space-y-1.5">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-lg border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] bg-[var(--card)] p-2.5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-xs font-semibold">{req.patient}</strong>
                      <span className="text-[10px] text-[var(--muted)] font-mono">{req.phone}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[8px] font-bold ${
                          req.type === "refill"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200"
                            : req.type === "urgent"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200"
                        }`}
                      >
                        {req.type.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--muted)]">{req.time}</span>
                  </div>

                  <p className="mt-0.5 text-xs font-medium text-[var(--foreground)]">{req.medicine}</p>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] pt-2">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-[var(--muted)]">Status:</span>
                      {req.status === "pending" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/70 dark:text-amber-200">
                          <Clock size={10} /> Needs STK Push
                        </span>
                      )}
                      {req.status === "stk_sent" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950/70 dark:text-blue-200">
                          <Smartphone size={10} /> Prompt Sent
                        </span>
                      )}
                      {req.status === "paid" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
                          <CheckCircle2 size={10} /> KES {req.amount} Paid
                        </span>
                      )}
                      {req.status === "ready" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950/70 dark:text-purple-200">
                          <Package size={10} /> Ready
                        </span>
                      )}
                      {req.status === "dispatched" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-950/70 dark:text-teal-200">
                          <Truck size={10} /> Dispatched ✓
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => advanceRequest(req.id)}
                      disabled={req.status === "dispatched"}
                      className={`btn-primary text-xs !min-h-[26px] !py-0.5 px-2.5 active:scale-95 transition-all ${
                        req.status === "dispatched" ? "cursor-not-allowed" : ""
                      }`}
                    >
                      {req.status === "pending" && (
                        <>
                          <Smartphone size={11} className="mr-1 inline" /> Push STK (KES {req.amount})
                        </>
                      )}
                      {req.status === "stk_sent" && (
                        <>
                          <Check size={11} className="mr-1 inline" /> Simulate Payment
                        </>
                      )}
                      {req.status === "paid" && (
                        <>
                          <Package size={11} className="mr-1 inline" /> Mark Ready
                        </>
                      )}
                      {req.status === "ready" && (
                        <>
                          <Truck size={11} className="mr-1 inline" /> Dispatch Boda
                        </>
                      )}
                      {req.status === "dispatched" && "Fulfilled"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
              <span>💡 When dispatched, next WhatsApp reminder is scheduled 28 days later.</span>
              <button
                type="button"
                onClick={() => {
                  setRequests(INITIAL_REQUESTS);
                  triggerToast("Requests queue reset");
                }}
                className="font-bold text-[var(--brand)] underline"
              >
                Reset
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
