"use client";

/**
 * Searchable, paginated MedicationPicker.
 *
 * Companion to CustomerPicker — used in the PrescriptionForm so admins
 * pick a medication from the catalogue instead of typing the name free-text.
 *
 *   - Searchable by name, SKU, or category.
 *   - Debounced 220ms.
 *   - Selecting a medication calls `onChange` with the full row so the form
 *     can auto-populate medicineName, rxReference, unitPrice, etc.
 *
 * Replaces the old free-text "Medicine name" field on prescriptions, which
 * led to duplicate / inconsistent data (the prompt's #1 prescription issue).
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X, Pill } from "lucide-react";

export type MedicationOption = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  category: string;
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  dosage: string | null;
  description: string | null;
};

export function MedicationPicker({
  name = "medicationId",
  value,
  onChange,
  placeholder = "Search medication by name or SKU…",
  variant = "admin",
  required,
}: {
  name?: string;
  value?: string;
  onChange?: (med: MedicationOption | null) => void;
  placeholder?: string;
  variant?: "admin" | "portal";
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<MedicationOption[]>([]);
  const [selected, setSelected] = useState<MedicationOption | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click-outside to close.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `/api/customers/search?resource=medications&q=${encodeURIComponent(query)}`;
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) {
          setOptions([]);
          return;
        }
        const j = (await r.json()) as { medications?: MedicationOption[] };
        setOptions(j.medications ?? []);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query]);

  // Resolve the currently-selected medication (name + live stock) when value is set externally.
  useEffect(() => {
    if (!value) {
      // Clearing the local selection when the value prop is cleared.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(null);
      return;
    }
    // Already showing this id — keep current row (avoids refetch thrash on re-renders).
    if (selected?.id === value) return;

    let cancelled = false;
    fetch(
      `/api/customers/search?resource=medications&id=${encodeURIComponent(value)}`,
      { cache: "no-store" },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { medication?: MedicationOption } | null) => {
        if (cancelled || !j?.medication) return;
        setSelected(j.medication);
        // Let the parent pick up live stockQty when value was set without a picker click
        // (e.g. edit form hydrate). Parent should treat this like a selection.
        onChange?.(j.medication);
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      cancelled = true;
    };
    // Intentionally omit onChange/selected from deps — we only re-resolve when `value` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const inputCls =
    variant === "admin"
      ? "input-admin pl-9 pr-9"
      : "input-premium pl-9 pr-9";

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value || ""} required={required} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} w-full cursor-pointer text-left`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Search
          className={`pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
            variant === "admin" ? "admin-soft" : "text-[#8a9a92]"
          }`}
        />
        <span className={selected ? "" : variant === "admin" ? "admin-soft" : "text-[#8a9a92]"}>
          {selected ? (
            <>
              <strong>{selected.name}</strong>
              <span className="ml-1 text-xs opacity-70">
                · KES {selected.price}
                {selected.sku ? ` · ${selected.sku}` : ""}
                {selected.stockQty <= 0
                  ? " · out of stock"
                  : selected.stockQty <= selected.lowStockThreshold
                    ? ` · low stock (${selected.stockQty})`
                    : ` · ${selected.stockQty} in stock`}
              </span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
            variant === "admin" ? "admin-soft" : "text-[#8a9a92]"
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-xl ${
            variant === "admin"
              ? "border-[var(--admin-border-2)] bg-[var(--admin-card)]"
              : "border-[#e3ebe6] bg-white"
          }`}
        >
          <div className="border-b border-inherit p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search medications…"
              className={`w-full rounded-lg border px-3 py-1.5 text-sm outline-none ${
                variant === "admin"
                  ? "border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-text"
                  : "border-[#e3ebe6] text-[#0c1a14]"
              }`}
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {loading && (
              <li className="px-3 py-2 text-xs opacity-60">Searching…</li>
            )}
            {!loading && options.length === 0 && (
              <li className="px-3 py-3 text-xs opacity-60">
                {query ? "No medications match your search." : "Type to search medications."}
              </li>
            )}
            {!loading &&
              options.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(m);
                      setOpen(false);
                      onChange?.(m);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--admin-hover)] ${
                      variant === "admin" ? "admin-text" : "text-[#0c1a14]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        <Pill className="mr-1 inline h-3 w-3 admin-accent-text" />
                        {m.name}
                      </span>
                      <span className={`block truncate text-[10px] ${variant === "admin" ? "admin-soft" : "text-[#8a9a92]"}`}>
                        {m.category.replace(/-/g, " ")}
                        {m.sku ? ` · ${m.sku}` : ""}
                        {m.prescriptionRequired ? " · Rx required" : " · OTC"}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-semibold ${
                        m.stockQty <= 0
                          ? "text-rose-600"
                          : m.stockQty <= m.lowStockThreshold
                            ? "text-amber-600"
                            : "opacity-70"
                      }`}
                    >
                      KES {m.price} ·{" "}
                      {m.stockQty <= 0
                        ? "Out of stock"
                        : `${m.stockQty} in stock`}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      {selected && (
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            onChange?.(null);
          }}
          className={`absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5 ${
            variant === "admin" ? "admin-soft hover:bg-[var(--admin-inset-2)]" : "text-[#8a9a92] hover:bg-[#f4f7f4]"
          }`}
          aria-label="Clear selection"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
