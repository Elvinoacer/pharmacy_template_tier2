"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import styles from "./listing.module.css";

export type ListingChip = {
  id: string;
  label: string;
  pressed: boolean;
  onSelect: () => void;
};

export type ListingSort = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type ListingToggle = {
  id: string;
  label: string;
  pressed: boolean;
  onToggle: () => void;
};

export type ListingField = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  chips?: ListingChip[];
  count: number;
  countLabel: string;
  sortValue: string;
  sortOptions: ListingSort[];
  onSort: (value: string) => void;
  toggles?: ListingToggle[];
  fields?: ListingField[];
  near?: { label: string; busy?: boolean; onClick: () => void };
  radar?: { on: boolean; onChange: (on: boolean) => void };
  tuneCount?: number;
  summary?: string | null;
  onClear?: () => void;
  openSearch?: boolean;
};

export default function ListingChrome({
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  chips = [],
  count,
  countLabel,
  sortValue,
  sortOptions,
  onSort,
  toggles = [],
  fields = [],
  near,
  radar,
  tuneCount = 0,
  summary,
  onClear,
  openSearch = false,
}: Props) {
  const sheetId = useId();
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [manuallyOpen, setManuallyOpen] = useState(openSearch);
  const [sheetOpen, setSheetOpen] = useState(false);
  const searchOpen = manuallyOpen || query.trim().length > 0;

  useEffect(() => {
    if (!openSearch) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [openSearch]);

  useEffect(() => {
    if (!sheetOpen) return;
    const node = sheetRef.current;
    const previously = document.activeElement as HTMLElement | null;
    node?.focus();
    const narrow = window.matchMedia("(max-width: 839px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (narrow) document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previously?.focus();
    };
  }, [sheetOpen]);

  function onSheetKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !sheetRef.current) return;
    const items = [...sheetRef.current.querySelectorAll<HTMLElement>("button, select, input, a")].filter(
      (item) => !item.hasAttribute("disabled"),
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={styles.stage}>
      <div className={styles.bar} data-search={searchOpen ? "open" : "closed"}>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.searchToggle}`}
          aria-label={searchOpen ? "Close search" : searchLabel}
          aria-expanded={searchOpen}
          onClick={() => {
            if (searchOpen) {
              onQueryChange("");
              setManuallyOpen(false);
              return;
            }
            setManuallyOpen(true);
            window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
          }}
        >
          {searchOpen ? <X className="h-4 w-4" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
        </button>

        <label className={styles.searchSlot} htmlFor={searchId}>
          <span className={styles.sr}>{searchLabel}</span>
          <input
            ref={inputRef}
            id={searchId}
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            enterKeyHint="search"
            autoComplete="off"
            className={styles.searchInput}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          {query ? (
            <button type="button" className={styles.searchClear} aria-label="Clear search" onClick={() => onQueryChange("")}>
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </label>

        {chips.length > 0 ? (
          <div className={styles.chips} role="toolbar" aria-label="Categories">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={styles.chip}
                aria-pressed={chip.pressed}
                title={chip.label}
                onClick={chip.onSelect}
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : (
          <span className={styles.chips} />
        )}

        <span className={styles.count} aria-live="polite">
          <span className={styles.sr}>{countLabel}</span>
          <span aria-hidden="true">{count}</span>
        </span>

        <button
          type="button"
          className={styles.iconBtn}
          aria-label={tuneCount > 0 ? `Refine, ${tuneCount} active` : "Refine"}
          aria-expanded={sheetOpen}
          aria-controls={sheetId}
          data-on={tuneCount > 0 ? "true" : "false"}
          onClick={() => setSheetOpen((open) => !open)}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {tuneCount > 0 ? <span className={styles.dot} aria-hidden /> : null}
        </button>

        {sheetOpen ? (
          <>
            <button type="button" className={styles.backdrop} aria-label="Close refine" onClick={() => setSheetOpen(false)} />
            <div
              ref={sheetRef}
              id={sheetId}
              className={styles.sheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${sheetId}-title`}
              tabIndex={-1}
              onKeyDown={onSheetKeyDown}
            >
              <div className={styles.handle} aria-hidden />
              <div className={styles.sheetTop}>
                <h2 id={`${sheetId}-title`}>Refine</h2>
                <button type="button" className={styles.iconBtn} aria-label="Close refine" onClick={() => setSheetOpen(false)}>
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              {sortOptions.length > 0 ? (
                <>
                  <p className={styles.sheetLabel}>Sort</p>
                  <select
                    className={styles.field}
                    aria-label="Sort"
                    value={sortValue}
                    onChange={(event) => onSort(event.target.value)}
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}

              {toggles.length > 0 ? (
                <>
                  <p className={styles.sheetLabel}>Show</p>
                  {toggles.map((toggle) => (
                    <button
                      key={toggle.id}
                      type="button"
                      className={styles.toggle}
                      aria-pressed={toggle.pressed}
                      onClick={toggle.onToggle}
                    >
                      <span>{toggle.label}</span>
                      <span className={styles.switch} aria-hidden>
                        <i />
                      </span>
                    </button>
                  ))}
                </>
              ) : null}

              {fields.map((field) => (
                <label key={field.id}>
                  <span className={styles.sheetLabel}>{field.label}</span>
                  <select className={styles.field} value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                    <option value="">{field.placeholder}</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              {near ? (
                <button type="button" className={styles.near} disabled={near.busy} onClick={near.onClick}>
                  {near.label}
                </button>
              ) : null}

              {radar ? (
                <button
                  type="button"
                  className={styles.toggle}
                  aria-pressed={radar.on}
                  onClick={() => radar.onChange(!radar.on)}
                >
                  <span>Show on a radar</span>
                  <span className={styles.switch} aria-hidden>
                    <i />
                  </span>
                </button>
              ) : null}

              {onClear ? (
                <button type="button" className={styles.clear} onClick={onClear}>
                  Clear refine
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {summary ? (
        <p className={styles.summary}>
          <span>{summary}</span>
          {onClear ? (
            <button type="button" onClick={onClear}>
              Clear
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
