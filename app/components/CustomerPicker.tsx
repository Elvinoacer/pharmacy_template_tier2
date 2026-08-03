"use client";

/**
 * Searchable, paginated customer picker.
 *
 * Replaces the brittle `<select>` dropdowns that break with 100+ customers.
 * - Customers are loaded via an API route (server-side filtered by role).
 * - The dropdown is debounced-searchable by name, email, or phone.
 * - Same-name customers are disambiguated by email.
 *
 * Used in: LoyaltyForm, ReminderForm, AdminMessageForm (anywhere we pick a customer).
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export type CustomerOption = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  points?: number;
};

export function CustomerPicker({
  name = "customerId",
  value,
  onChange,
  placeholder = "Search customer by name, email, or phone…",
  variant = "admin",
  required,
}: {
  name?: string;
  value?: string;
  onChange?: (customerId: string) => void;
  placeholder?: string;
  variant?: "admin" | "portal";
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [selected, setSelected] = useState<CustomerOption | null>(null);
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
        const url = `/api/customers/search?q=${encodeURIComponent(query)}`;
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) {
          setOptions([]);
          return;
        }
        const j = (await r.json()) as { customers?: CustomerOption[] };
        setOptions(j.customers ?? []);
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

  // Resolve the currently-selected customer's display name when value is set externally.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    // Fetch the customer record by ID (one-off).
    let cancelled = false;
    fetch(`/api/customers/search?id=${encodeURIComponent(value)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { customer?: CustomerOption } | null) => {
        if (!cancelled && j?.customer) setSelected(j.customer);
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      cancelled = true;
    };
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
              <strong>{selected.fullName}</strong>
              <span className="ml-1 text-xs opacity-70">· {selected.email}</span>
              {typeof selected.points === "number" && (
                <span className="ml-1 text-xs opacity-70">· {selected.points} pts</span>
              )}
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
              placeholder="Type to search…"
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
                {query ? "No customers match your search." : "Type to search customers."}
              </li>
            )}
            {!loading &&
              options.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(c);
                      setOpen(false);
                      onChange?.(c.id);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--admin-hover)] ${
                      variant === "admin" ? "admin-text" : "text-[#0c1a14]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.fullName}</span>
                      <span className={`block truncate text-[10px] ${variant === "admin" ? "admin-soft" : "text-[#8a9a92]"}`}>
                        {c.email}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </span>
                    </span>
                    {typeof c.points === "number" && (
                      <span className="shrink-0 text-[10px] font-semibold opacity-70">
                        {c.points} pts
                      </span>
                    )}
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
            onChange?.("");
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
