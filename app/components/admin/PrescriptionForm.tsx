"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import {
  Pill,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  Check,
  Save,
  Hash,
  Boxes,
  Tag,
  Plus,
  Trash2,
  Clock,
  Utensils,
} from "lucide-react";
import { CustomerPicker } from "@/app/components/CustomerPicker";
import { MedicationPicker, type MedicationOption } from "@/app/components/MedicationPicker";
import { FREQUENCY_PRESETS, type FoodCondition } from "@/app/lib/medication-schedule-shared";

/**
 * Prescription creation / edit form.
 *
 * Create mode supports multiple drugs on one form (each becomes its own
 * Prescription row sharing customer/prescriber/dates). Schedule is structured
 * (frequency + times + food) and written straight to MedicationSchedule —
 * free-text is only kept as a display summary.
 */

type DrugRow = {
  key: string;
  medicationId: string;
  medicineName: string;
  rxReference: string;
  dosage: string;
  unitPrice: string;
  quantity: string;
  daysSupply: string;
  refillsRemaining: string;
  frequency: string;
  times: string[];
  foodCondition: FoodCondition;
  /** Free-text fallback shown only for legacy edit / import confirmation. */
  freeTextSchedule: string;
  /** Live catalogue stock for the linked medication (null = not linked yet). */
  stockQty: number | null;
  lowStockThreshold: number | null;
};

function emptyDrug(partial?: Partial<DrugRow>): DrugRow {
  return {
    key: partial?.key ?? `d-${Math.random().toString(36).slice(2, 9)}`,
    medicationId: partial?.medicationId ?? "",
    medicineName: partial?.medicineName ?? "",
    rxReference: partial?.rxReference ?? "",
    dosage: partial?.dosage ?? "",
    unitPrice: partial?.unitPrice ?? "",
    quantity: partial?.quantity ?? "30",
    daysSupply: partial?.daysSupply ?? "30",
    refillsRemaining: partial?.refillsRemaining ?? "0",
    frequency: partial?.frequency ?? "bid",
    times: partial?.times ?? ["08:00", "20:00"],
    foodCondition: partial?.foodCondition ?? "none",
    freeTextSchedule: partial?.freeTextSchedule ?? "",
    stockQty: partial?.stockQty ?? null,
    lowStockThreshold: partial?.lowStockThreshold ?? null,
  };
}

/** Clamp a quantity string to available stock; returns the value to store. */
function clampQtyToStock(raw: string, stockQty: number | null): string {
  if (stockQty === null) return raw;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return raw;
  if (stockQty <= 0) return "0";
  if (n > stockQty) return String(stockQty);
  return raw;
}

function qtyNumber(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function presetTimes(frequency: string): string[] {
  const preset = FREQUENCY_PRESETS[frequency];
  return preset ? preset.slots.map((s) => s.timeOfDay) : ["08:00"];
}

function parseLegacyScheduleHint(text: string | null | undefined): {
  frequency: string;
  times: string[];
  foodCondition: FoodCondition;
} {
  const t = (text || "").toLowerCase();
  let foodCondition: FoodCondition = "none";
  if (/\bwith\s*food\b|\bafter\s*meals?\b|\bwith\s*meals?\b/.test(t)) foodCondition = "with_food";
  else if (/\bwithout\s*food\b|\bon\s*empty\s*stomach\b|\bbefore\s*meals?\b/.test(t)) {
    foodCondition = "without_food";
  }

  if (/\b(four\s*times|qid|4x)\b/.test(t)) {
    return { frequency: "qid", times: presetTimes("qid"), foodCondition };
  }
  if (/\b(three\s*times|tid|3x|with\s*meals?)\b/.test(t)) {
    if (/\bwith\s*meals?\b/.test(t)) {
      return { frequency: "with_meals", times: presetTimes("with_meals"), foodCondition: "with_food" };
    }
    return { frequency: "tid", times: presetTimes("tid"), foodCondition };
  }
  if (/\b(twice|bid|2x)\b/.test(t)) {
    return { frequency: "bid", times: presetTimes("bid"), foodCondition };
  }
  if (/\b(once|qd|daily|1x)\b/.test(t)) {
    return { frequency: "qd", times: presetTimes("qd"), foodCondition };
  }
  // Try to extract HH:mm tokens
  const times = Array.from(text?.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g) ?? []).map(
    (m) => `${m[1].padStart(2, "0")}:${m[2]}`,
  );
  if (times.length > 0) {
    return { frequency: "custom", times, foodCondition };
  }
  return { frequency: "bid", times: presetTimes("bid"), foodCondition };
}

export default function PrescriptionForm({
  action,
  initial,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: {
    id: string;
    customerId: string;
    medicationId: string | null;
    medicineName: string;
    rxReference: string | null;
    dosage: string | null;
    schedule: string | null;
    quantity: number | null;
    daysSupply: number | null;
    refillsRemaining: number | null;
    unitPrice: number | null;
    status: string;
    startDate: string | null;
    nextRefillDue: string | null;
    endDate: string | null;
    prescriber: string | null;
    notes: string | null;
  };
}) {
  const isEdit = Boolean(initial?.id);
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");

  const initialParsed = useMemo(
    () => parseLegacyScheduleHint(initial?.schedule),
    [initial?.schedule],
  );

  const [drugs, setDrugs] = useState<DrugRow[]>(() => [
    emptyDrug({
      medicationId: initial?.medicationId ?? "",
      medicineName: initial?.medicineName ?? "",
      rxReference: initial?.rxReference ?? "",
      dosage: initial?.dosage ?? "",
      unitPrice: initial?.unitPrice?.toString() ?? "",
      quantity: initial?.quantity?.toString() ?? "30",
      daysSupply: initial?.daysSupply?.toString() ?? "30",
      refillsRemaining: initial?.refillsRemaining?.toString() ?? "0",
      frequency: initialParsed.frequency,
      times: initialParsed.times,
      foodCondition: initialParsed.foodCondition,
      freeTextSchedule: initial?.schedule ?? "",
    }),
  ]);

  const [showLegacyConfirm, setShowLegacyConfirm] = useState(
    Boolean(initial?.schedule && !isEdit === false && initial.schedule.length > 0),
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      if (!isEdit) {
        setCustomerId("");
        setDrugs([emptyDrug()]);
      }
    }
    if (state?.error) toast.error(state.error);
  }, [state, isEdit]);

  function updateDrug(key: string, patch: Partial<DrugRow>) {
    setDrugs((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function onMedicationSelected(key: string, m: MedicationOption | null) {
    if (!m) {
      updateDrug(key, {
        medicationId: "",
        stockQty: null,
        lowStockThreshold: null,
      });
      return;
    }

    const stock = m.stockQty;
    const current = drugs.find((d) => d.key === key);
    const currentQty = qtyNumber(current?.quantity ?? "");
    const sameMedAlready = current?.medicationId === m.id && current.stockQty === stock;

    // Default fill is 30 — never more than what's on the shelf.
    let nextQty = current?.quantity ?? "30";
    let clamped = false;
    if (stock <= 0) {
      nextQty = "0";
      clamped = currentQty > 0;
    } else if (!current?.quantity || currentQty === 0) {
      nextQty = String(Math.min(30, stock));
    } else if (currentQty > stock) {
      nextQty = String(stock);
      clamped = true;
    }

    updateDrug(key, {
      medicationId: m.id,
      medicineName:
        current?.medicineName && current.medicineName !== m.name
          ? current.medicineName
          : m.name,
      rxReference: current?.rxReference || m.sku || "",
      dosage: current?.dosage || m.dosage || "",
      unitPrice: current?.unitPrice || m.price.toString(),
      quantity: nextQty,
      stockQty: stock,
      lowStockThreshold: m.lowStockThreshold,
    });

    // Skip repeat toasts when picker re-hydrates the same med+stock.
    if (sameMedAlready) return;

    if (stock <= 0) {
      toast.error(`${m.name} is out of stock. Receive inventory before prescribing.`);
    } else if (clamped) {
      toast.info(`Quantity set to ${stock} — only ${stock} of ${m.name} in stock.`);
    } else if (stock <= m.lowStockThreshold) {
      toast.info(`${m.name}: low stock (${stock} left). Cap for this fill is ${stock}.`);
    }
  }

  /** Client-side stock checks across all drug rows (incl. same med twice). */
  const stockIssues = useMemo(() => {
    const demand = new Map<string, { name: string; need: number; stock: number }>();
    for (const d of drugs) {
      if (!d.medicationId || d.stockQty === null) continue;
      const need = qtyNumber(d.quantity);
      const prev = demand.get(d.medicationId);
      if (prev) {
        prev.need += need;
      } else {
        demand.set(d.medicationId, {
          name: d.medicineName || "Medication",
          need,
          stock: d.stockQty,
        });
      }
    }
    const issues: string[] = [];
    for (const row of demand.values()) {
      if (row.stock <= 0 && row.need > 0) {
        issues.push(`${row.name} is out of stock (0 on hand).`);
      } else if (row.need > row.stock) {
        issues.push(
          `${row.name}: need ${row.need} but only ${row.stock} in stock.`,
        );
      }
    }
    return issues;
  }, [drugs]);

  const hasStockBlock = stockIssues.length > 0;

  function onQuantityChange(key: string, raw: string) {
    const drug = drugs.find((d) => d.key === key);
    if (!drug) return;
    // Allow free typing while editing; clamp only when clearly over max.
    if (drug.stockQty !== null && raw !== "" && Number(raw) > drug.stockQty) {
      updateDrug(key, { quantity: String(drug.stockQty) });
      toast.info(`Max available is ${drug.stockQty} units.`);
      return;
    }
    updateDrug(key, { quantity: raw });
  }

  function onFrequencyChange(key: string, frequency: string) {
    const times = frequency === "custom" ? undefined : presetTimes(frequency);
    updateDrug(key, {
      frequency,
      ...(times ? { times } : {}),
    });
  }

  function applyLegacyParse(key: string) {
    const drug = drugs.find((d) => d.key === key);
    if (!drug) return;
    const parsed = parseLegacyScheduleHint(drug.freeTextSchedule || drug.dosage);
    updateDrug(key, {
      frequency: parsed.frequency,
      times: parsed.times,
      foodCondition: parsed.foodCondition,
    });
    setShowLegacyConfirm(true);
    toast.success(
      `Understood as ${parsed.times.length}×/day at ${parsed.times.join(", ")} — adjust if needed.`,
    );
  }

  function addDrug() {
    setDrugs((prev) => [...prev, emptyDrug()]);
  }

  function removeDrug(key: string) {
    setDrugs((prev) => (prev.length <= 1 ? prev : prev.filter((d) => d.key !== key)));
  }

  // Serialize structured drugs for the server action.
  const drugsPayload = JSON.stringify(
    drugs.map((d) => ({
      medicationId: d.medicationId || null,
      medicineName: d.medicineName,
      rxReference: d.rxReference || null,
      dosage: d.dosage || null,
      unitPrice: d.unitPrice ? Number(d.unitPrice) : null,
      quantity: d.quantity ? Number(d.quantity) : null,
      daysSupply: d.daysSupply ? Number(d.daysSupply) : null,
      refillsRemaining: d.refillsRemaining ? Number(d.refillsRemaining) : 0,
      frequency: d.frequency,
      times: d.times,
      foodCondition: d.foodCondition,
    })),
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="admin-alert-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="admin-alert-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}

      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="drugsJson" value={drugsPayload} />

      <div>
        <label className="label-admin">Customer *</label>
        <CustomerPicker
          name="customerId"
          value={customerId}
          onChange={setCustomerId}
          variant="admin"
          required
        />
      </div>

      {/* ── Per-drug rows ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide admin-muted">
            Medication{!isEdit ? "s" : ""} on this prescription
          </p>
          {!isEdit && (
            <button
              type="button"
              onClick={addDrug}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-2.5 py-1 text-[11px] font-semibold admin-accent-text hover:brightness-110"
            >
              <Plus className="h-3 w-3" /> Add another drug
            </button>
          )}
        </div>

        {drugs.map((drug, idx) => (
          <div
            key={drug.key}
            className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold admin-text">
                <Pill className="mr-1 inline h-3.5 w-3.5" />
                Drug {idx + 1}
                {drug.medicineName ? ` — ${drug.medicineName}` : ""}
              </p>
              {!isEdit && drugs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDrug(drug.key)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>

            <div>
              <label className="label-admin">Medication from catalogue *</label>
              <MedicationPicker
                name={`_medicationId_${drug.key}`}
                value={drug.medicationId}
                onChange={(m) => onMedicationSelected(drug.key, m)}
                variant="admin"
                required
                placeholder="Search medication by name, SKU, or category…"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label-admin">Medicine name *</label>
                <div className="relative">
                  <Pill className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                  <input
                    required
                    value={drug.medicineName}
                    onChange={(e) => updateDrug(drug.key, { medicineName: e.target.value })}
                    placeholder="Lisinopril 10mg"
                    className="input-admin pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="label-admin">Rx reference</label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                  <input
                    value={drug.rxReference}
                    onChange={(e) => updateDrug(drug.key, { rxReference: e.target.value })}
                    placeholder="RX-2024-88421"
                    className="input-admin pl-9 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label-admin">Dosage (strength / form)</label>
                <input
                  value={drug.dosage}
                  onChange={(e) => updateDrug(drug.key, { dosage: e.target.value })}
                  placeholder="10mg tablet"
                  className="input-admin"
                />
              </div>
              <div>
                <label className="label-admin">Units per dose</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  defaultValue="1"
                  name={`_units_${drug.key}`}
                  onChange={(e) => {
                    /* units are derived from dosage text when blank; keep simple */
                    void e;
                  }}
                  className="input-admin"
                  placeholder="1"
                />
                <p className="mt-0.5 text-[10px] admin-soft">How many tablets/capsules each time.</p>
              </div>
            </div>

            {/* Structured schedule */}
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3 space-y-3">
              <p className="text-[11px] font-semibold admin-text flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Dose schedule
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-admin">Frequency *</label>
                  <select
                    value={drug.frequency}
                    onChange={(e) => onFrequencyChange(drug.key, e.target.value)}
                    className="input-admin"
                  >
                    {Object.entries(FREQUENCY_PRESETS).map(([value, meta]) => (
                      <option key={value} value={value}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-admin flex items-center gap-1">
                    <Utensils className="h-3 w-3" /> Food condition
                  </label>
                  <select
                    value={drug.foodCondition}
                    onChange={(e) =>
                      updateDrug(drug.key, { foodCondition: e.target.value as FoodCondition })
                    }
                    className="input-admin"
                  >
                    <option value="none">No restriction</option>
                    <option value="with_food">With food</option>
                    <option value="without_food">Without food / empty stomach</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-admin">Dose times (HH:mm)</label>
                <div className="flex flex-wrap gap-2">
                  {drug.times.map((t, ti) => (
                    <div key={`${drug.key}-t-${ti}`} className="flex items-center gap-1">
                      <input
                        type="time"
                        value={t}
                        onChange={(e) => {
                          const next = [...drug.times];
                          next[ti] = e.target.value;
                          updateDrug(drug.key, { times: next, frequency: "custom" });
                        }}
                        className="input-admin !w-auto"
                      />
                      {drug.times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = drug.times.filter((_, i) => i !== ti);
                            updateDrug(drug.key, {
                              times: next.length ? next : ["08:00"],
                              frequency: "custom",
                            });
                          }}
                          className="rounded p-1 text-rose-600 hover:bg-rose-500/10"
                          aria-label="Remove time"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateDrug(drug.key, {
                        times: [...drug.times, "12:00"],
                        frequency: "custom",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--admin-border)] px-2 py-1 text-[10px] font-semibold admin-muted hover:admin-accent-text"
                  >
                    <Plus className="h-3 w-3" /> Time
                  </button>
                </div>
                <p className="mt-1 text-[10px] admin-soft">
                  These slots drive automatic dose reminders and adherence tracking.
                </p>
              </div>

              {/* Legacy free-text → structured confirmation */}
              <div className="border-t border-[var(--admin-border)] pt-3">
                <label className="label-admin">Or paste free-text schedule (optional)</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={drug.freeTextSchedule}
                    onChange={(e) => updateDrug(drug.key, { freeTextSchedule: e.target.value })}
                    placeholder="e.g. 1 tablet twice daily after meals"
                    className="input-admin flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => applyLegacyParse(drug.key)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-2 text-[11px] font-semibold admin-text hover:brightness-110"
                  >
                    Parse &amp; pre-fill
                  </button>
                </div>
                {showLegacyConfirm && drug.freeTextSchedule && (
                  <p className="mt-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[10px] text-emerald-800">
                    We understood this as <strong>{drug.times.length}×/day</strong> at{" "}
                    <strong>{drug.times.join(", ")}</strong>
                    {drug.foodCondition !== "none"
                      ? ` · ${drug.foodCondition === "with_food" ? "with food" : "without food"}`
                      : ""}
                    . Confirm or adjust the times above before saving.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="label-admin">
                  Quantity
                  {drug.stockQty !== null && (
                    <span
                      className={`ml-1.5 font-semibold normal-case tracking-normal ${
                        drug.stockQty <= 0
                          ? "text-rose-600"
                          : drug.lowStockThreshold !== null &&
                              drug.stockQty <= drug.lowStockThreshold
                            ? "text-amber-600"
                            : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      · {drug.stockQty} in stock
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                  <input
                    type="number"
                    min="0"
                    max={drug.stockQty !== null ? drug.stockQty : undefined}
                    value={drug.quantity}
                    onChange={(e) => onQuantityChange(drug.key, e.target.value)}
                    onBlur={(e) => {
                      if (drug.stockQty === null) return;
                      const clamped = clampQtyToStock(e.target.value, drug.stockQty);
                      if (clamped !== e.target.value) {
                        updateDrug(drug.key, { quantity: clamped });
                      }
                    }}
                    placeholder={
                      drug.stockQty !== null
                        ? String(Math.min(30, Math.max(0, drug.stockQty)))
                        : "30"
                    }
                    className={`input-admin pl-9 ${
                      drug.stockQty !== null && qtyNumber(drug.quantity) > drug.stockQty
                        ? "border-rose-500/60 ring-1 ring-rose-500/30"
                        : drug.stockQty !== null && drug.stockQty <= 0
                          ? "border-rose-500/40"
                          : ""
                    }`}
                    aria-invalid={
                      drug.stockQty !== null && qtyNumber(drug.quantity) > drug.stockQty
                    }
                  />
                </div>
                {drug.stockQty !== null && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {drug.stockQty <= 0 ? (
                      <p className="text-[10px] font-semibold text-rose-600">
                        Out of stock — receive inventory before prescribing.
                      </p>
                    ) : qtyNumber(drug.quantity) > drug.stockQty ? (
                      <p className="text-[10px] font-semibold text-rose-600">
                        Only {drug.stockQty} available. Quantity will be capped.
                      </p>
                    ) : (
                      <p className="text-[10px] admin-soft">
                        Max dispense this fill: <strong>{drug.stockQty}</strong>
                        {drug.lowStockThreshold !== null &&
                          drug.stockQty <= drug.lowStockThreshold && (
                            <span className="ml-1 font-semibold text-amber-600">
                              (low stock)
                            </span>
                          )}
                      </p>
                    )}
                    {drug.stockQty > 0 && qtyNumber(drug.quantity) !== drug.stockQty && (
                      <button
                        type="button"
                        onClick={() =>
                          updateDrug(drug.key, { quantity: String(drug.stockQty) })
                        }
                        className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-2 py-0.5 text-[10px] font-semibold admin-accent-text hover:brightness-110"
                      >
                        Use all {drug.stockQty}
                      </button>
                    )}
                  </div>
                )}
                {drug.medicationId === "" && (
                  <p className="mt-1 text-[10px] admin-soft">
                    Link a catalogue medication to see live stock limits.
                  </p>
                )}
              </div>
              <div>
                <label className="label-admin">Days supply</label>
                <input
                  type="number"
                  min="0"
                  value={drug.daysSupply}
                  onChange={(e) => updateDrug(drug.key, { daysSupply: e.target.value })}
                  placeholder="30"
                  className="input-admin"
                />
              </div>
              <div>
                <label className="label-admin">Refills remaining</label>
                <input
                  type="number"
                  min="0"
                  value={drug.refillsRemaining}
                  onChange={(e) => updateDrug(drug.key, { refillsRemaining: e.target.value })}
                  className="input-admin"
                />
              </div>
              <div>
                <label className="label-admin">Unit price (KES)</label>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={drug.unitPrice}
                    onChange={(e) => updateDrug(drug.key, { unitPrice: e.target.value })}
                    placeholder="500"
                    className="input-admin pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shared course fields */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label-admin">Status</label>
          <select name="status" className="input-admin" defaultValue={initial?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="expired">Expired</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
        <div>
          <label className="label-admin">Start date</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="startDate"
              type="date"
              defaultValue={initial?.startDate?.slice(0, 10) ?? ""}
              className="input-admin pl-9"
            />
          </div>
        </div>
        <div>
          <label className="label-admin">Next refill due</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="nextRefillDue"
              type="date"
              defaultValue={initial?.nextRefillDue?.slice(0, 10) ?? ""}
              className="input-admin pl-9"
            />
          </div>
        </div>
        <div>
          <label className="label-admin">End date (course termination)</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="endDate"
              type="date"
              defaultValue={initial?.endDate?.slice(0, 10) ?? ""}
              className="input-admin pl-9"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label-admin">Prescriber</label>
        <input
          name="prescriber"
          defaultValue={initial?.prescriber ?? ""}
          placeholder="Dr. Jane Doe"
          className="input-admin"
        />
      </div>

      <div>
        <label className="label-admin">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ""}
          placeholder="Internal notes (visible to staff only)…"
          className="input-admin resize-y"
        />
      </div>

      {hasStockBlock && (
        <div className="admin-alert-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold">Cannot save — quantity exceeds stock on hand</p>
            <ul className="list-inside list-disc text-[11px] opacity-90">
              {stockIssues.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
            <p className="text-[11px] opacity-90">
              Lower the quantity, split the course, or receive stock first.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3 text-[10px] admin-soft">
        <p className="mb-1 font-semibold admin-text">
          <Boxes className="mr-1 inline h-3 w-3" /> Stock workflow
        </p>
        Quantity for each linked medication is capped at <strong>current stock</strong> so
        dispatch never fails for overselling. Creating a prescription still does{" "}
        <strong>not</strong> deduct inventory — that happens when you click{" "}
        <Tag className="inline h-2.5 w-2.5" /> Dispatch on the detail page.
        {!isEdit && drugs.length > 1 && (
          <> Each drug above is saved as its own prescription record under this customer.</>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || hasStockBlock}
        title={
          hasStockBlock
            ? "Fix stock quantity issues before saving"
            : undefined
        }
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? (
          <>
            <span className="typing-dot" /> Saving…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />{" "}
            {isEdit
              ? "Update prescription"
              : drugs.length > 1
                ? `Create ${drugs.length} prescriptions`
                : "Create prescription"}
          </>
        )}
      </button>
    </form>
  );
}
