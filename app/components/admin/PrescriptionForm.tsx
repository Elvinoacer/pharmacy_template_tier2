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
  User,
  Stethoscope,
  Info,
} from "lucide-react";
import { CustomerPicker } from "@/app/components/CustomerPicker";
import { MedicationPicker, type MedicationOption } from "@/app/components/MedicationPicker";
import {
  FREQUENCY_PRESETS,
  detectCrossesMidnight,
  inferLabelFromTime,
  overnightGapHours,
  presetLabels,
  presetTimes,
  resolveStructuredSchedule,
  sortTimesWithLabels,
  type FoodCondition,
} from "@/app/lib/medication-schedule-shared";
import { localTodayStr, PROJECT_TIMEZONE } from "@/app/lib/time";

/**
 * Prescription creation / edit form.
 *
 * Create mode supports multiple drugs on one form (each becomes its own
 * Prescription row sharing customer/prescriber/dates). Schedule is structured
 * (frequency + times + food) and written straight to MedicationSchedule —
 * free-text is only kept as a display summary.
 *
 * Dose times are normalised on blur/save: sorted chronologically for same-day
 * dosing, labels stay glued to each clock time, and a warning is shown when
 * entry order crosses midnight (e.g. 20:00 then 08:00).
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
  unitsPerDose: string;
  frequency: string;
  times: string[];
  /** Parallel to times — "Morning", "Evening", etc. Survives custom edits. */
  labels: string[];
  foodCondition: FoodCondition;
  /** Free-text fallback shown only for legacy edit / import confirmation. */
  freeTextSchedule: string;
  /** Live catalogue stock for the linked medication (null = not linked yet). */
  stockQty: number | null;
  lowStockThreshold: number | null;
};

function emptyDrug(partial?: Partial<DrugRow>): DrugRow {
  const frequency = partial?.frequency ?? "bid";
  const times = partial?.times ?? presetTimes(frequency);
  const labels =
    partial?.labels ??
    times.map((t, i) => presetLabels(frequency)[i] || inferLabelFromTime(t, i));
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
    unitsPerDose: partial?.unitsPerDose ?? "1",
    frequency,
    times,
    labels,
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

function parseLegacyScheduleHint(text: string | null | undefined): {
  frequency: string;
  times: string[];
  labels: string[];
  foodCondition: FoodCondition;
} {
  const t = (text || "").toLowerCase();
  let foodCondition: FoodCondition = "none";
  if (/\bwith\s*food\b|\bafter\s*meals?\b|\bwith\s*meals?\b/.test(t)) foodCondition = "with_food";
  else if (/\bwithout\s*food\b|\bon\s*empty\s*stomach\b|\bbefore\s*meals?\b/.test(t)) {
    foodCondition = "without_food";
  }

  function withPreset(frequency: string, food: FoodCondition = foodCondition) {
    const times = presetTimes(frequency);
    return { frequency, times, labels: presetLabels(frequency), foodCondition: food };
  }

  if (/\b(four\s*times|qid|4x)\b/.test(t)) {
    return withPreset("qid");
  }
  if (/\b(three\s*times|tid|3x|with\s*meals?)\b/.test(t)) {
    if (/\bwith\s*meals?\b/.test(t)) {
      return withPreset("with_meals", "with_food");
    }
    return withPreset("tid");
  }
  if (/\b(twice|bid|2x)\b/.test(t)) {
    return withPreset("bid");
  }
  if (/\b(once|qd|daily|1x)\b/.test(t)) {
    return withPreset("qd");
  }
  const times = Array.from(text?.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g) ?? []).map(
    (m) => `${m[1].padStart(2, "0")}:${m[2]}`,
  );
  if (times.length > 0) {
    const sorted = sortTimesWithLabels(
      times,
      times.map((tm, i) => inferLabelFromTime(tm, i)),
    );
    return {
      frequency: "custom",
      times: sorted.times,
      labels: sorted.labels,
      foodCondition,
    };
  }
  return withPreset("bid");
}

/** Live schedule preview + day-boundary warning for one drug row. */
function schedulePreview(drug: DrugRow) {
  return resolveStructuredSchedule({
    frequency: drug.frequency,
    times: drug.times,
    labels: drug.labels,
    foodCondition: drug.foodCondition,
    unitsPerDose: Number(drug.unitsPerDose) || 1,
  });
}

/** Field label with required / optional badge. */
function FieldLabel({
  children,
  required,
  optional,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
      <label className="text-xs font-semibold admin-muted">{children}</label>
      {required && (
        <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-700">
          Required
        </span>
      )}
      {optional && !required && (
        <span className="rounded-full bg-[var(--admin-inset-2)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide admin-soft">
          Optional
        </span>
      )}
      {hint && <span className="text-[10px] admin-soft">· {hint}</span>}
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--admin-inset-2)] pb-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold admin-text">{title}</h3>
            {description && <p className="mt-0.5 text-[11px] admin-soft">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
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
  const todayLocal = localTodayStr();

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
      labels: initialParsed.labels,
      foodCondition: initialParsed.foodCondition,
      freeTextSchedule: initial?.schedule ?? "",
    }),
  ]);

  const [showLegacyConfirm, setShowLegacyConfirm] = useState(
    Boolean(initial?.schedule && isEdit && initial.schedule.length > 0),
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

    if (sameMedAlready) return;

    if (stock <= 0) {
      toast.error(`${m.name} is out of stock. Receive inventory before prescribing.`);
    } else if (clamped) {
      toast.info(`Quantity set to ${stock} — only ${stock} of ${m.name} in stock.`);
    } else if (stock <= m.lowStockThreshold) {
      toast.info(`${m.name}: low stock (${stock} left). Cap for this fill is ${stock}.`);
    }
  }

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
        issues.push(`${row.name}: need ${row.need} but only ${row.stock} in stock.`);
      }
    }
    return issues;
  }, [drugs]);

  const hasStockBlock = stockIssues.length > 0;

  function onQuantityChange(key: string, raw: string) {
    const drug = drugs.find((d) => d.key === key);
    if (!drug) return;
    if (drug.stockQty !== null && raw !== "" && Number(raw) > drug.stockQty) {
      updateDrug(key, { quantity: String(drug.stockQty) });
      toast.info(`Max available is ${drug.stockQty} units.`);
      return;
    }
    updateDrug(key, { quantity: raw });
  }

  function onFrequencyChange(key: string, frequency: string) {
    if (frequency === "custom") {
      updateDrug(key, { frequency });
      return;
    }
    const times = presetTimes(frequency);
    const labels = presetLabels(frequency);
    updateDrug(key, { frequency, times, labels });
  }

  /** Keep labels parallel to times; infer when a slot is added/changed. */
  function setDrugTimes(
    key: string,
    nextTimes: string[],
    nextLabels?: string[],
    opts?: { sort?: boolean; markCustom?: boolean },
  ) {
    const drug = drugs.find((d) => d.key === key);
    if (!drug) return;
    let times = nextTimes.length ? nextTimes : ["08:00"];
    let labels =
      nextLabels ??
      times.map(
        (t, i) => drug.labels[i] || inferLabelFromTime(t, i),
      );
    // Pad / trim labels to match times.
    labels = times.map((t, i) => labels[i]?.trim() || inferLabelFromTime(t, i));

    if (opts?.sort !== false) {
      const sorted = sortTimesWithLabels(times, labels);
      times = sorted.times;
      labels = sorted.labels;
    }

    updateDrug(key, {
      times,
      labels,
      ...(opts?.markCustom !== false ? { frequency: "custom" as const } : {}),
    });
  }

  function normalizeDrugSchedule(key: string) {
    const drug = drugs.find((d) => d.key === key);
    if (!drug) return;
    const crossed = detectCrossesMidnight(drug.times);
    const sorted = sortTimesWithLabels(drug.times, drug.labels);
    const changed =
      sorted.times.join(",") !== drug.times.join(",") ||
      sorted.labels.join(",") !== drug.labels.join(",");
    if (changed) {
      updateDrug(key, {
        times: sorted.times,
        labels: sorted.labels,
        frequency: drug.frequency === "custom" || crossed ? "custom" : drug.frequency,
      });
    }
    if (crossed) {
      const gap = overnightGapHours(drug.times);
      toast.info(
        `Times crossed midnight${gap != null ? ` (≈${gap}h gap)` : ""} — sorted to same-day order: ${sorted.times.join(", ")}.`,
      );
    }
  }

  function applyLegacyParse(key: string) {
    const drug = drugs.find((d) => d.key === key);
    if (!drug) return;
    const parsed = parseLegacyScheduleHint(drug.freeTextSchedule || drug.dosage);
    updateDrug(key, {
      frequency: parsed.frequency,
      times: parsed.times,
      labels: parsed.labels,
      foodCondition: parsed.foodCondition,
    });
    setShowLegacyConfirm(true);
    toast.success(
      `Understood as ${parsed.times.length}×/day at ${parsed.times.map((t, i) => `${t} (${parsed.labels[i]})`).join(", ")} — adjust if needed.`,
    );
  }

  function addDrug() {
    setDrugs((prev) => [...prev, emptyDrug()]);
  }

  function removeDrug(key: string) {
    setDrugs((prev) => (prev.length <= 1 ? prev : prev.filter((d) => d.key !== key)));
  }

  // Normalise times/labels before submit so server always gets sorted same-day slots.
  const drugsPayload = JSON.stringify(
    drugs.map((d) => {
      const resolved = resolveStructuredSchedule({
        frequency: d.frequency,
        times: d.times,
        labels: d.labels,
        foodCondition: d.foodCondition,
        unitsPerDose: Number(d.unitsPerDose) || 1,
      });
      return {
        medicationId: d.medicationId || null,
        medicineName: d.medicineName,
        rxReference: d.rxReference || null,
        dosage: d.dosage || null,
        unitPrice: d.unitPrice ? Number(d.unitPrice) : null,
        quantity: d.quantity ? Number(d.quantity) : null,
        daysSupply: d.daysSupply ? Number(d.daysSupply) : null,
        refillsRemaining: d.refillsRemaining ? Number(d.refillsRemaining) : 0,
        unitsPerDose: d.unitsPerDose ? Number(d.unitsPerDose) : 1,
        frequency: d.frequency,
        times: resolved.slots.map((s) => s.timeOfDay),
        labels: resolved.slots.map((s) => s.label || inferLabelFromTime(s.timeOfDay)),
        foodCondition: d.foodCondition,
        // First dose in the admin's original entry order — used on start day
        // so earlier clock times are not auto-missed when the cycle wraps.
        cycleAnchorTime: resolved.cycleAnchorTime,
        crossesMidnight: resolved.crossesMidnight,
      };
    }),
  );

  const tzLabel = PROJECT_TIMEZONE.replace(/_/g, " ");

  return (
    <form action={formAction} className="space-y-5">
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

      {/* ── Patient ───────────────────────────────────────────── */}
      <SectionCard
        title="Patient"
        description="Who this prescription belongs to"
        icon={User}
      >
        <div className="max-w-xl">
          <FieldLabel required>Customer</FieldLabel>
          <CustomerPicker
            name="customerId"
            value={customerId}
            onChange={setCustomerId}
            variant="admin"
            required
          />
        </div>
      </SectionCard>

      {/* ── Medications ───────────────────────────────────────── */}
      <SectionCard
        title={isEdit ? "Medication" : "Medications"}
        description={
          isEdit
            ? "Drug, dose schedule, and supply for this Rx"
            : "Each drug becomes its own prescription under this customer"
        }
        icon={Pill}
        action={
          !isEdit ? (
            <button
              type="button"
              onClick={addDrug}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1.5 text-[11px] font-semibold admin-accent-text transition hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" /> Add drug
            </button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {drugs.map((drug, idx) => (
            <div
              key={drug.key}
              className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-sm font-bold admin-text">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-[11px] font-extrabold text-emerald-700">
                    {idx + 1}
                  </span>
                  {drug.medicineName || `Drug ${idx + 1}`}
                </p>
                {!isEdit && drugs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDrug(drug.key)}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>

              {/* Catalogue + name row */}
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <FieldLabel required hint="link catalogue for live stock">
                    Medication from catalogue
                  </FieldLabel>
                  <MedicationPicker
                    name={`_medicationId_${drug.key}`}
                    value={drug.medicationId}
                    onChange={(m) => onMedicationSelected(drug.key, m)}
                    variant="admin"
                    required
                    placeholder="Search by name, SKU, or category…"
                  />
                </div>
                <div className="lg:col-span-5">
                  <FieldLabel required>Medicine name</FieldLabel>
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
              </div>

              {/* Identity / strength */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <FieldLabel optional>Rx reference</FieldLabel>
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
                <div>
                  <FieldLabel optional>Dosage (strength / form)</FieldLabel>
                  <input
                    value={drug.dosage}
                    onChange={(e) => updateDrug(drug.key, { dosage: e.target.value })}
                    placeholder="10mg tablet"
                    className="input-admin"
                  />
                </div>
                <div>
                  <FieldLabel optional hint="tablets each time">
                    Units per dose
                  </FieldLabel>
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={drug.unitsPerDose}
                    onChange={(e) => updateDrug(drug.key, { unitsPerDose: e.target.value })}
                    className="input-admin"
                    placeholder="1"
                  />
                </div>
                <div>
                  <FieldLabel optional>Unit price (KES)</FieldLabel>
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

              {/* Schedule */}
              <div className="mt-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold admin-text">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" /> Dose schedule
                  </p>
                  <span className="text-[10px] admin-soft">
                    Drives reminders · {tzLabel}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <FieldLabel required>Frequency</FieldLabel>
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
                    <FieldLabel optional>
                      <span className="inline-flex items-center gap-1">
                        <Utensils className="h-3 w-3" /> Food condition
                      </span>
                    </FieldLabel>
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
                  <div className="sm:col-span-2 lg:col-span-1">
                    <FieldLabel required hint="HH:mm · auto-sorted">
                      Dose times
                    </FieldLabel>
                    <div className="flex flex-wrap items-end gap-2">
                      {drug.times.map((t, ti) => (
                        <div
                          key={`${drug.key}-t-${ti}`}
                          className="flex flex-col gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-2"
                        >
                          <input
                            type="text"
                            value={drug.labels[ti] || ""}
                            onChange={(e) => {
                              const nextLabels = [...drug.labels];
                              nextLabels[ti] = e.target.value;
                              updateDrug(drug.key, {
                                labels: nextLabels,
                                frequency: "custom",
                              });
                            }}
                            onBlur={() => normalizeDrugSchedule(drug.key)}
                            placeholder={inferLabelFromTime(t, ti)}
                            className="input-admin !h-7 !w-[7.5rem] !px-2 !py-0 text-[10px] font-semibold"
                            aria-label={`Label for dose ${ti + 1}`}
                            title="Dose label (e.g. Morning, Evening)"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={t}
                              onChange={(e) => {
                                const nextTimes = [...drug.times];
                                const nextLabels = [...drug.labels];
                                nextTimes[ti] = e.target.value;
                                // Re-infer label only when it still looks auto-generated.
                                const prevAuto = inferLabelFromTime(t, ti);
                                if (!nextLabels[ti] || nextLabels[ti] === prevAuto) {
                                  nextLabels[ti] = inferLabelFromTime(e.target.value, ti);
                                }
                                // Don't sort on every keystroke — wait for blur.
                                updateDrug(drug.key, {
                                  times: nextTimes,
                                  labels: nextLabels,
                                  frequency: "custom",
                                });
                              }}
                              onBlur={() => normalizeDrugSchedule(drug.key)}
                              className="input-admin !w-[7.5rem] font-mono"
                            />
                            {drug.times.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextTimes = drug.times.filter((_, i) => i !== ti);
                                  const nextLabels = drug.labels.filter((_, i) => i !== ti);
                                  setDrugTimes(
                                    drug.key,
                                    nextTimes.length ? nextTimes : ["08:00"],
                                    nextLabels.length ? nextLabels : undefined,
                                  );
                                }}
                                className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-500/10"
                                aria-label="Remove time"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const nextTime = "12:00";
                          setDrugTimes(
                            drug.key,
                            [...drug.times, nextTime],
                            [...drug.labels, inferLabelFromTime(nextTime, drug.times.length)],
                            { sort: true },
                          );
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--admin-border)] px-2.5 py-1.5 text-[10px] font-semibold admin-muted transition hover:admin-accent-text"
                      >
                        <Plus className="h-3 w-3" /> Time
                      </button>
                      {detectCrossesMidnight(drug.times) && (
                        <button
                          type="button"
                          onClick={() => normalizeDrugSchedule(drug.key)}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200"
                        >
                          Sort chronologically
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {(() => {
                  const preview = schedulePreview(drug);
                  return (
                    <div className="mt-3 space-y-2">
                      {preview.warning && (
                        <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-900 dark:text-amber-100">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{preview.warning}</span>
                        </p>
                      )}
                      <p className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-900 dark:text-emerald-200">
                        <span className="font-semibold">Saved as: </span>
                        {preview.scheduleText}
                      </p>
                    </div>
                  );
                })()}

                <div className="mt-4 border-t border-[var(--admin-border)] pt-3">
                  <FieldLabel optional hint="paste then parse">
                    Free-text schedule
                  </FieldLabel>
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
                      className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-2 text-[11px] font-semibold admin-text transition hover:brightness-110"
                    >
                      Parse &amp; pre-fill
                    </button>
                  </div>
                  {showLegacyConfirm && drug.freeTextSchedule && (
                    <p className="mt-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                      Understood as <strong>{drug.times.length}×/day</strong> at{" "}
                      <strong>
                        {drug.times
                          .map((t, i) => `${t}${drug.labels[i] ? ` (${drug.labels[i]})` : ""}`)
                          .join(", ")}
                      </strong>
                      {drug.foodCondition !== "none"
                        ? ` · ${drug.foodCondition === "with_food" ? "with food" : "without food"}`
                        : ""}
                      . Confirm or adjust times above before saving.
                    </p>
                  )}
                </div>
              </div>

              {/* Supply row */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <FieldLabel
                    optional
                    hint={
                      drug.stockQty !== null
                        ? `${drug.stockQty} in stock`
                        : "link catalogue for stock"
                    }
                  >
                    Quantity (this fill)
                  </FieldLabel>
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
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {drug.stockQty <= 0 ? (
                        <p className="text-[10px] font-semibold text-rose-600">
                          Out of stock — receive inventory first.
                        </p>
                      ) : qtyNumber(drug.quantity) > drug.stockQty ? (
                        <p className="text-[10px] font-semibold text-rose-600">
                          Only {drug.stockQty} available. Quantity will be capped.
                        </p>
                      ) : (
                        <p className="text-[10px] admin-soft">
                          Max this fill: <strong>{drug.stockQty}</strong>
                          {drug.lowStockThreshold !== null &&
                            drug.stockQty <= drug.lowStockThreshold && (
                              <span className="ml-1 font-semibold text-amber-600">(low)</span>
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
                </div>
                <div>
                  <FieldLabel optional>Days supply</FieldLabel>
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
                  <FieldLabel optional>Refills remaining</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    value={drug.refillsRemaining}
                    onChange={(e) => updateDrug(drug.key, { refillsRemaining: e.target.value })}
                    className="input-admin"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Course & admin ────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Course dates"
          description={`Calendar days in ${tzLabel}`}
          icon={Calendar}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel optional hint="defaults to today if blank">
                Start date
              </FieldLabel>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input
                  name="startDate"
                  type="date"
                  defaultValue={
                    initial?.startDate?.slice(0, 10) || (!isEdit ? todayLocal : "")
                  }
                  className="input-admin pl-9"
                />
              </div>
            </div>
            <div>
              <FieldLabel optional>Next refill due</FieldLabel>
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
              <FieldLabel optional>End date</FieldLabel>
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
            <div>
              <FieldLabel optional>Status</FieldLabel>
              <select
                name="status"
                className="input-admin"
                defaultValue={initial?.status ?? "active"}
              >
                <option value="active">Active</option>
                <option value="on_hold">On hold</option>
                <option value="expired">Expired</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Prescriber & notes"
          description="Administrative metadata"
          icon={Stethoscope}
        >
          <div className="space-y-4">
            <div>
              <FieldLabel optional>Prescriber</FieldLabel>
              <input
                name="prescriber"
                defaultValue={initial?.prescriber ?? ""}
                placeholder="Dr. Jane Doe / Staff pharmacist"
                className="input-admin"
              />
            </div>
            <div>
              <FieldLabel optional hint="staff only">
                Notes
              </FieldLabel>
              <textarea
                name="notes"
                rows={4}
                defaultValue={initial?.notes ?? ""}
                placeholder="Internal notes (visible to staff only)…"
                className="input-admin resize-y"
              />
            </div>
          </div>
        </SectionCard>
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

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-[11px] admin-soft">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-semibold admin-text">
              <Boxes className="mr-1 inline h-3 w-3" /> Stock workflow
            </p>
            <p className="mt-0.5">
              Creating does <strong>not</strong> deduct inventory — click{" "}
              <Tag className="inline h-2.5 w-2.5" /> Dispatch on the detail page.
              Dose times use <strong>{tzLabel}</strong>.
              {!isEdit && drugs.length > 1 && (
                <> Each drug is saved as its own prescription record.</>
              )}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending || hasStockBlock}
          title={hasStockBlock ? "Fix stock quantity issues before saving" : undefined}
          className="btn-admin shrink-0 !rounded-xl px-6 py-2.5 disabled:opacity-50 sm:min-w-[220px]"
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
      </div>
    </form>
  );
}
