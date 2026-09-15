"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useActionState } from "react";
import { saveStorefrontAction, type StorefrontActionState } from "@/app/actions/storefront";
import { ExternalLink, Eye, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { STOREFRONT_TEMPLATE } from "@/app/lib/storefront-template";
import ImageUploadField from "@/app/components/admin/ImageUploadField";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyDoc = Record<string, any>;

export type StudioBasics = {
  tagline: string;
  about: string;
  logoUrl: string;
  coverImageUrl: string;
  deliveryNotes: string;
  deliveryFeeKes: string;
  deliveryRadiusKm: string;
  careersEmail: string;
};

const initialActionState: StorefrontActionState = {};

const TABS = [
  "Basics",
  "Hero",
  "Home sections",
  "Team & photos",
  "FAQ",
  "Careers & delivery",
  "Brand & CTA",
] as const;
type Tab = (typeof TABS)[number];

/** Strip null / "" / undefined so we persist a minimal override document. */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(prune);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = prune(v);
      if (cleaned !== null && cleaned !== "") out[k] = cleaned;
    }
    return out;
  }
  return value;
}

/** Patch one object slot of a list living anywhere in the doc. */
function patchListItem(
  list: AnyDoc[] | null,
  i: number,
  patch: AnyDoc,
): AnyDoc[] | null {
  if (!list) return list;
  return list.map((item, j) => (j === i ? { ...item, ...patch } : item));
}

/** Shallow array compare used to detect "back to template" edits. */
function listsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** About-page story, values and visibility — deep component needs live doc. */
function AboutCopySection({
  doc,
  setDoc,
}: {
  doc: AnyDoc;
  setDoc: React.Dispatch<React.SetStateAction<AnyDoc>>;
}) {
  const about = doc.about || {};
  const overridden = "about" in doc;
  return (
    <Section
      title="About page story & values"
      description="storyHeading, closing note, value cards and roster/photo visibility."
      actions={
        <CloneOrResetBar
          isOverridden={overridden}
          singular="about page"
          onClone={() =>
            setDoc((prev) => ({ ...prev, about: { ...(prev.about || {}) } }))
          }
          onReset={() => setDoc((prev) => ({ ...prev, about: null }))}
        />
      }
    >
      {overridden ? (
        <div className="space-y-4">
          <DocField
            label="Story heading"
            value={about.storyHeading ?? ""}
            placeholder={STOREFRONT_TEMPLATE.about.storyHeading}
            onChange={(v) => setDoc((prev) => ({ ...prev, about: { ...(prev.about || {}), storyHeading: v } }))}
          />
          <DocField
            label="Closing note"
            textarea
            value={about.closingNote ?? ""}
            placeholder={STOREFRONT_TEMPLATE.about.closingNote}
            onChange={(v) => setDoc((prev) => ({ ...prev, about: { ...(prev.about || {}), closingNote: v } }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {(["showTeam", "showGallery"] as const).map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 rounded-xl border border-current px-3.5 py-2.5 text-sm admin-text">
                <span>{k === "showTeam" ? "Show team roster" : "Show photo wall"}</span>
                <input
                  type="checkbox"
                  checked={about[k] !== false}
                  onChange={(e) => setDoc((prev) => ({ ...prev, about: { ...(prev.about || {}), [k]: e.target.checked } }))}
                  className="h-4 w-4 accent-teal-600"
                />
              </label>
            ))}
          </div>
          <div>
            <p className="label-admin">Value cards</p>
            {(Array.isArray(about.values) ? about.values : STOREFRONT_TEMPLATE.about.values.map((v) => ({ ...v }))).map(
              (v: AnyDoc, i: number, arr: AnyDoc[]) => (
                <div key={`val-${i}`} className="mb-2 flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={v.title ?? ""}
                      placeholder={`Value ${i + 1} title`}
                      onChange={(e) => {
                        const next = [...arr];
                        next[i] = { ...next[i], title: e.target.value };
                        setDoc((prev) => ({ ...prev, about: { ...(prev.about || {}), values: next } }));
                      }}
                      className="input-admin"
                    />
                    <input
                      type="text"
                      value={v.description ?? ""}
                      placeholder="Description"
                      onChange={(e) => {
                        const next = [...arr];
                        next[i] = { ...next[i], description: e.target.value };
                        setDoc((prev) => ({ ...prev, about: { ...(prev.about || {}), values: next } }));
                      }}
                      className="input-admin"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove value ${i + 1}`}
                    onClick={() => setDoc((prev) => ({ ...prev, about: { ...(prev.about || {}), values: arr.filter((_, j) => j !== i) } }))}
                    className="btn-icon btn-icon-admin mt-1 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            )}
          </div>
        </div>
      ) : (
        <ul className="space-y-1 rounded-xl bg-black/10 p-4 text-xs admin-muted">
          <li>• Heading: “{STOREFRONT_TEMPLATE.about.storyHeading}”</li>
          {STOREFRONT_TEMPLATE.about.values.map((v) => (
            <li key={v.title}>• Value card: {v.title}</li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="admin-card rounded-2xl border p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold admin-text">{title}</h3>
          {description && <p className="mt-1 text-xs admin-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  hint,
  type = "text",
  textarea,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label-admin">
        {label}
        {!required && <span className="ml-1 font-normal opacity-60">(template default used if blank)</span>}
      </span>
      {textarea ? (
        <textarea
          name={name}
          rows={4}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="input-admin"
        />
      ) : (
        <input
          name={name}
          type={type}
          step={type === "number" ? "any" : undefined}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="input-admin"
        />
      )}
      {hint && <span className="mt-1 block text-xs leading-relaxed admin-muted">{hint}</span>}
    </label>
  );
}

/** Text input bound to the override doc; blank = inherit template. */
function DocField({
  label,
  value,
  placeholder,
  onChange,
  textarea,
  hint,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string | null) => void;
  textarea?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label-admin">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            onChange(e.target.value.trim() === "" ? null : e.target.value)
          }
          className="input-admin"
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          className="input-admin"
        />
      )}
      {hint && <span className="mt-1 block text-xs leading-relaxed admin-muted">{hint}</span>}
    </label>
  );
}

function StringListEditor({
  items,
  onChange,
  addLabel,
  inputPlaceholder,
  max,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  inputPlaceholder?: string;
  max?: number;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={`${i}-${item.slice(0, 12)}`} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            placeholder={inputPlaceholder}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next.filter((x, j) => x !== "" || j === i));
            }}
            className="input-admin flex-1"
          />
          <button
            type="button"
            aria-label={`Remove item ${i + 1}`}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="btn-icon btn-icon-admin shrink-0 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {(max === undefined || items.length < max) && (
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-current px-3 py-1.5 text-xs font-semibold admin-muted hover:admin-text"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function CloneOrResetBar({
  isOverridden,
  onClone,
  onReset,
  singular,
}: {
  isOverridden: boolean;
  onClone: () => void;
  onReset: () => void;
  singular: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isOverridden && (
        <>
          <span className="rounded-full bg-teal-900/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-teal-700">
            Template default
          </span>
          <button type="button" onClick={onClone} className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-700">
            Customise this {singular}
          </button>
        </>
      )}
      {isOverridden && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-full border border-current px-3 py-1 text-xs font-semibold admin-muted hover:admin-text"
        >
          <RotateCcw className="h-3 w-3" /> Restore template
        </button>
      )}
    </div>
  );
}

export default function StorefrontCustomizer({
  slug,
  savedDoc,
  savedOverridesCount,
  basics,
}: {
  slug: string | null;
  savedDoc: Record<string, unknown>;
  savedOverridesCount: boolean;
  basics: StudioBasics;
}) {
  const [state, action, pending] = useActionState(saveStorefrontAction, initialActionState);
  const [tab, setTab] = useState<Tab>("Basics");
  const [doc, setDoc] = useState<AnyDoc>(() =>
    JSON.parse(JSON.stringify(savedDoc || {})) as AnyDoc,
  );

  // ── doc helpers ────────────────────────────────────────────────────────
  const setSection = useCallback((section: string, patch: AnyDoc | null) => {
    setDoc((prev) => {
      const next: AnyDoc = { ...prev };
      if (patch === null) delete next[section];
      else next[section] = { ...(prev[section] || {}), ...patch };
      return next;
    });
  }, []);

  const clearPathField = useCallback((section: string, key: string) => {
    setDoc((prev) => {
      const next: AnyDoc = { ...prev };
      if (!next[section]) return prev;
      const inner = { ...next[section] };
      delete inner[key];
      if (Object.keys(inner).length === 0) delete next[section];
      else next[section] = inner;
      return next;
    });
  }, []);

  const docString = useMemo(
    () => JSON.stringify({ version: 1, ...(prune(doc) as AnyDoc) }),
    [doc],
  );

  const hero = doc.hero || {};
  const sections = doc.sections || {};
  const why = doc.whyChooseUs || {};
  const teamList: AnyDoc[] | null = Array.isArray(doc.team) ? doc.team : null;
  const galleryList: AnyDoc[] | null = Array.isArray(doc.gallery) ? doc.gallery : null;
  const faqList: AnyDoc[] | null = Array.isArray(doc.faq) ? doc.faq : null;
  const stepsList: string[] | null = Array.isArray(doc.deliverySteps) ? doc.deliverySteps : null;
  const careers = doc.careers || {};
  const careersJobs: AnyDoc[] | null = Array.isArray(careers.jobs) ? careers.jobs : null;
  const cta = doc.ctaBanner || {};
  const brand = doc.theme || {};
  const social = doc.social || {};

  const sec = (key: string): boolean => !(key in sections) || sections[key] !== false;

  const setJobs = useCallback((i: number, patch: AnyDoc) => {
    setDoc((prev) => ({
      ...prev,
      careers: {
        ...(prev.careers || {}),
        jobs: patchListItem((prev.careers?.jobs as AnyDoc[] | null) ?? [], i, patch),
      },
    }));
  }, []);

  const toggleSection = (key: string, v: boolean) =>
    setDoc((prev) => ({
      ...prev,
      sections: { ...(prev.sections || {}), [key]: v },
    }));

  return (
    <form action={action} className="space-y-6">
      {/* status strip */}
      <div className="admin-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold admin-text">
            {savedOverridesCount ? "Custom room active" : "Running on the network template"}
          </p>
          <p className="mt-0.5 truncate text-xs admin-muted">
            Public address: {slug ? `/p/${slug}` : "no pharmacy selected"} — leave any field blank
            and the shared template fills it automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {slug && (
            <a
              href={`/p/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-ghost-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open live storefront
            </a>
          )}
          <button type="submit" disabled={pending} className="btn-primary btn-primary-sm">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Saving…" : "Save & publish"}
          </button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {state.success}
        </p>
      )}

      {/* tabs */}
      <div className="hide-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === t
                ? "bg-teal-600 text-white shadow"
                : "border border-current admin-muted hover:admin-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <input type="hidden" name="storefrontJson" value={docString} />

      {/* ══ TAB: Basics ═══════════════════════════════════════════════ */}
      {tab === "Basics" && (
        <div className="space-y-5">
          <Section
            title="Identity"
            description="Stored on your pharmacy profile — flows through every page, navbar and contact surface."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tagline" name="tagline" defaultValue={basics.tagline} placeholder={STOREFRONT_TEMPLATE.hero.headlineStart + "…"} />
              <Field label="Careers application email" name="careersEmail" defaultValue={basics.careersEmail} placeholder="jobs@yourpharmacy.co.ke" />
              <div className="sm:col-span-1">
                <ImageUploadField
                  name="logoUrl"
                  label="Pharmacy logo"
                  folder="pharmacies"
                  defaultValue={basics.logoUrl}
                  hint="Upload logo PNG, WebP or SVG."
                />
              </div>
              <div className="sm:col-span-1">
                <ImageUploadField
                  name="coverImageUrl"
                  label="Cover hero image"
                  folder="pharmacies"
                  defaultValue={basics.coverImageUrl}
                  hint="Upload storefront or interior photo."
                />
              </div>
              <label className="sm:col-span-2">
                <span className="label-admin">About your shop</span>
                <textarea name="about" rows={5} defaultValue={basics.about} className="input-admin" placeholder="Tell patients what makes your counter worth walking up to…" />
              </label>
            </div>
          </Section>

          <Section
            title="Delivery facts"
            description="Shown on the delivery page, why-choose-us bullets and refill flow."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Delivery fee (KES)" name="deliveryFeeKes" type="number" defaultValue={basics.deliveryFeeKes} placeholder="150" />
              <Field label="Delivery radius (km)" name="deliveryRadiusKm" type="number" defaultValue={basics.deliveryRadiusKm} placeholder="8" />
              <div className="sm:col-span-1" />
              <Field label="Delivery notes" name="deliveryNotes" defaultValue={basics.deliveryNotes} placeholder="Same-day within the ring road before 4 PM." />
            </div>
          </Section>

          <AboutCopySection doc={doc} setDoc={setDoc} />
        </div>
      )}

      {/* ══ TAB: Hero ═════════════════════════════════════════════════ */}
      {tab === "Hero" && (
        <Section
          title="Welcome hero"
          description="The first screen patients see inside /p/{slug}. Ghosted values are the network template."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DocField
              label="Status badge"
              value={hero.kickerBadge ?? ""}
              placeholder={STOREFRONT_TEMPLATE.hero.kickerBadge || "Open today · live from your hours"}
              onChange={(v) => setSection("hero", { kickerBadge: v })}
              hint="Leave blank to derive “Open today” automatically from published hours."
            />
            <DocField
              label="Headline opening words"
              value={hero.headlineStart ?? ""}
              placeholder={STOREFRONT_TEMPLATE.hero.headlineStart}
              onChange={(v) => setSection("hero", { headlineStart: v })}
            />
            <DocField
              label="Highlighted word"
              value={hero.highlight ?? ""}
              placeholder={STOREFRONT_TEMPLATE.hero.highlight}
              onChange={(v) => setSection("hero", { highlight: v })}
              hint="Rendered with the animated gradient underline."
            />
            <DocField
              label="Text after highlight"
              value={hero.headlineEnd ?? ""}
              placeholder={STOREFRONT_TEMPLATE.hero.headlineEnd}
              onChange={(v) => setSection("hero", { headlineEnd: v })}
            />
            <DocField
              label="Italic second line"
              value={hero.subline ?? ""}
              placeholder={STOREFRONT_TEMPLATE.hero.subline}
              onChange={(v) => setSection("hero", { subline: v })}
            />
            <DocField
              label="Sub-caption under address"
              value={hero.secondaryLineLabel ?? ""}
              placeholder={STOREFRONT_TEMPLATE.hero.secondaryLineLabel}
              onChange={(v) => setSection("hero", { secondaryLineLabel: v })}
            />
            <div className="sm:col-span-2">
              <DocField
                label="Description paragraph"
                textarea
                value={hero.description ?? ""}
                placeholder={STOREFRONT_TEMPLATE.hero.description}
                onChange={(v) => setSection("hero", { description: v })}
                hint="Supports tokens: {description} injects your About text."
              />
            </div>
          </div>
          <div className="mt-4">
            <CloneOrResetBar
              isOverridden={"hero" in doc}
              singular="hero"
              onClone={() => setDoc((prev) => ({ ...prev, hero: { ...(prev.hero || {}) } }))}
              onReset={() => setSection("hero", null)}
            />
          </div>
        </Section>
      )}

      {/* ══ TAB: Home sections ════════════════════════════════════════ */}
      {tab === "Home sections" && (
        <div className="space-y-5">
          <Section title="Sections on your home page" description="Turn template sections off if they don't fit your room yet.">
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["services", "Featured services"],
                ["whyChooseUs", "Why choose us"],
                ["gallery", "Photo wall"],
                ["healthTips", "Health library articles"],
                ["testimonials", "Patient reviews"],
                ["insuranceStrip", "Insurance & certifications strip"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-current px-3.5 py-2.5 text-sm admin-text">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={sec(key)}
                    onChange={(e) => toggleSection(key, e.target.checked)}
                    className="h-4 w-4 accent-teal-600"
                  />
                </label>
              ))}
            </div>
          </Section>

          <Section title="Health library labels" description="The article strip header on your home page.">
            <div className="grid gap-4 sm:grid-cols-2">
              <DocField
                label="Eyebrow"
                value={(doc.healthLibrary?.eyebrow as string) ?? ""}
                placeholder={STOREFRONT_TEMPLATE.healthLibrary.eyebrow}
                onChange={(v) => setDoc((prev) => ({ ...prev, healthLibrary: { ...(prev.healthLibrary || {}), eyebrow: v } }))}
              />
              <DocField
                label="Title"
                value={(doc.healthLibrary?.title as string) ?? ""}
                placeholder={STOREFRONT_TEMPLATE.healthLibrary.title}
                onChange={(v) => setDoc((prev) => ({ ...prev, healthLibrary: { ...(prev.healthLibrary || {}), title: v } }))}
              />
            </div>
          </Section>

          <Section
            title="Why choose us"
            description={why.bullets === undefined ? undefined : "The bullet reading __DELIVERY__ auto-renders your live delivery promise."}
            actions={
              <CloneOrResetBar
                isOverridden={"whyChooseUs" in doc}
                singular="section"
                onClone={() => setDoc((prev) => ({ ...prev, whyChooseUs: { ...(prev.whyChooseUs || {}) } }))}
                onReset={() => setSection("whyChooseUs", null)}
              />
            }
          >
            {("whyChooseUs" in doc) ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DocField
                    label="Eyebrow"
                    value={why.eyebrow ?? ""}
                    placeholder={`Why ${slug || "your pharmacy"}`}
                    onChange={(v) => setSection("whyChooseUs", { eyebrow: v })}
                    hint="Supports token: {name}"
                  />
                  <DocField
                    label="Title"
                    value={why.title ?? ""}
                    placeholder={STOREFRONT_TEMPLATE.whyChooseUs.title}
                    onChange={(v) => setSection("whyChooseUs", { title: v })}
                  />
                </div>
                <div>
                  <p className="label-admin">Bullets</p>
                  <StringListEditor
                    items={Array.isArray(why.bullets) ? why.bullets : [...STOREFRONT_TEMPLATE.whyChooseUs.bullets]}
                    onChange={(next) => setSection("whyChooseUs", { bullets: next.map((b) => b.trim()).filter(Boolean) })}
                    addLabel="Add bullet"
                    max={8}
                  />
                </div>
                <DocField
                  label="Side image URL"
                  value={why.imageUrl ?? ""}
                  placeholder={STOREFRONT_TEMPLATE.whyChooseUs.imageUrl}
                  onChange={(v) => setSection("whyChooseUs", { imageUrl: v })}
                />
              </div>
            ) : (
              <ul className="space-y-1.5 rounded-xl bg-black/10 p-4 text-xs admin-muted">
                {[...STOREFRONT_TEMPLATE.whyChooseUs.bullets].map((b) => (
                  <li key={b}>• {b === "__DELIVERY__" ? "__DELIVERY__ → live delivery promise" : b}</li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}

      {/* ══ TAB: Team & photos ════════════════════════════════════════ */}
      {tab === "Team & photos" && (
        <div className="space-y-5">
          <Section
            title="Team roster"
            description="People at the counter — shown on the storefront and about page."
            actions={
              <CloneOrResetBar
                isOverridden={teamList !== null}
                singular="roster"
                onClone={() =>
                  setDoc((prev) => ({ ...prev, team: STOREFRONT_TEMPLATE.team.map((m) => ({ ...m })) }))
                }
                onReset={() => setDoc((prev) => ({ ...prev, team: null }))}
              />
            }
          >
            {teamList !== null ? (
              <div className="space-y-4">
                {teamList.map((m, i) => (
                  <div key={`member-${i}`} className="rounded-xl border border-current p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold admin-muted">Member {i + 1}</p>
                      <button
                        type="button"
                        onClick={() => setDoc((prev) => ({ ...prev, team: (prev.team as AnyDoc[]).filter((_, j) => j !== i) }))}
                        className="btn-icon btn-icon-admin hover:text-red-500"
                        aria-label={`Remove member ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input type="text" value={m.name ?? ""} placeholder="Full name" onChange={(e) => setDoc((prev) => ({ ...prev, team: patchListItem(prev.team as AnyDoc[], i, { name: e.target.value }) }))} className="input-admin" />
                      <input type="text" value={m.role ?? ""} placeholder="Role" onChange={(e) => setDoc((prev) => ({ ...prev, team: patchListItem(prev.team as AnyDoc[], i, { role: e.target.value }) }))} className="input-admin" />
                      <input type="text" value={m.qualifications ?? ""} placeholder="Qualifications" onChange={(e) => setDoc((prev) => ({ ...prev, team: patchListItem(prev.team as AnyDoc[], i, { qualifications: e.target.value }) }))} className="input-admin sm:col-span-2" />
                      <input type="text" value={m.photo ?? ""} placeholder="https://…photo.webp" onChange={(e) => setDoc((prev) => ({ ...prev, team: patchListItem(prev.team as AnyDoc[], i, { photo: e.target.value }) }))} className="input-admin sm:col-span-2" />
                    </div>
                    <textarea rows={2} value={m.bio ?? ""} placeholder="Short bio" onChange={(e) => setDoc((prev) => ({ ...prev, team: patchListItem(prev.team as AnyDoc[], i, { bio: e.target.value }) }))} className="input-admin mt-2" />
                  </div>
                ))}
                {teamList.length < 12 && (
                  <button type="button" onClick={() => setDoc((prev) => ({ ...prev, team: [...(prev.team as AnyDoc[] || []), { id: `member-${Date.now()}`, name: "", role: "", bio: "", qualifications: "", photo: "" }] }))} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-current px-3 py-1.5 text-xs font-semibold admin-muted hover:admin-text">
                    <Plus className="h-3.5 w-3.5" /> Add member
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-1 rounded-xl bg-black/10 p-4 text-xs admin-muted">
                {STOREFRONT_TEMPLATE.team.map((t) => (
                  <li key={t.id}>• {t.name} — {t.role}</li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Photo wall"
            description="Six photos fill the masonry grid; the first spans large."
            actions={
              <CloneOrResetBar
                isOverridden={galleryList !== null}
                singular="gallery"
                onClone={() => setDoc((prev) => ({ ...prev, gallery: STOREFRONT_TEMPLATE.gallery.map((g) => ({ ...g })) }))}
                onReset={() => setDoc((prev) => ({ ...prev, gallery: null }))}
              />
            }
          >
            {galleryList !== null ? (
              <div className="space-y-4">
                {galleryList.map((g, i) => (
                  <div key={`gal-${i}`} className="rounded-xl border border-current p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold admin-muted">Photo {i + 1}</p>
                      <button type="button" onClick={() => setDoc((prev) => ({ ...prev, gallery: (prev.gallery as AnyDoc[]).filter((_, j) => j !== i) }))} className="btn-icon btn-icon-admin hover:text-red-500" aria-label={`Remove photo ${i + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 space-y-3">
                      <ImageUploadField
                        label={`Photo upload or URL`}
                        folder="gallery"
                        defaultValue={g.src ?? ""}
                        hint="Upload an image file or paste URL"
                        onChange={(url) => setDoc((prev) => ({ ...prev, gallery: patchListItem(prev.gallery as AnyDoc[], i, { src: url }) }))}
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input type="text" value={g.alt ?? ""} placeholder="Alt text" onChange={(e) => setDoc((prev) => ({ ...prev, gallery: patchListItem(prev.gallery as AnyDoc[], i, { alt: e.target.value }) }))} className="input-admin" />
                        <input type="text" value={g.caption ?? ""} placeholder="Caption" onChange={(e) => setDoc((prev) => ({ ...prev, gallery: patchListItem(prev.gallery as AnyDoc[], i, { caption: e.target.value }) }))} className="input-admin" />
                      </div>
                    </div>
                  </div>
                ))}
                {galleryList.length < 18 && (
                  <button type="button" onClick={() => setDoc((prev) => ({ ...prev, gallery: [...(prev.gallery as AnyDoc[] || []), { src: "", alt: "", caption: "" }] }))} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-current px-3 py-1.5 text-xs font-semibold admin-muted hover:admin-text">
                    <Plus className="h-3.5 w-3.5" /> Add photo
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs admin-muted">{STOREFRONT_TEMPLATE.gallery.length} template photos are showing.</p>
            )}
          </Section>
        </div>
      )}

      {/* ══ TAB: FAQ ══════════════════════════════════════════════════ */}
      {tab === "FAQ" && (
        <Section
          title="Frequently asked questions"
          description={`${STOREFRONT_TEMPLATE.faq.length} shared questions answer patients today.`}
          actions={
            <CloneOrResetBar
              isOverridden={faqList !== null}
              singular="FAQ"
              onClone={() => setDoc((prev) => ({ ...prev, faq: STOREFRONT_TEMPLATE.faq.map((f) => ({ ...f })) }))}
              onReset={() => setDoc((prev) => ({ ...prev, faq: null }))}
            />
          }
        >
          {faqList !== null ? (
            <div className="space-y-4">
              {faqList.map((f, i) => (
                <div key={`faq-${i}`} className="rounded-xl border border-current p-3">
                  <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                    <input type="text" value={f.category ?? ""} placeholder="Category" onChange={(e) => setDoc((prev) => ({ ...prev, faq: patchListItem(prev.faq as AnyDoc[], i, { category: e.target.value }) }))} className="input-admin" />
                    <input type="text" value={f.question ?? ""} placeholder="Question" onChange={(e) => setDoc((prev) => ({ ...prev, faq: patchListItem(prev.faq as AnyDoc[], i, { question: e.target.value }) }))} className="input-admin font-semibold" />
                  </div>
                  <textarea rows={3} value={f.answer ?? ""} placeholder="Answer" onChange={(e) => setDoc((prev) => ({ ...prev, faq: patchListItem(prev.faq as AnyDoc[], i, { answer: e.target.value }) }))} className="input-admin mt-2" />
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={() => setDoc((prev) => ({ ...prev, faq: (prev.faq as AnyDoc[]).filter((_, j) => j !== i) }))} className="btn-icon btn-icon-admin hover:text-red-500" aria-label={`Remove question ${i + 1}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {faqList.length < 30 && (
                <button type="button" onClick={() => setDoc((prev) => ({ ...prev, faq: [...(prev.faq as AnyDoc[] || []), { category: "General", question: "", answer: "" }] }))} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-current px-3 py-1.5 text-xs font-semibold admin-muted hover:admin-text">
                  <Plus className="h-3.5 w-3.5" /> Add question
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs admin-muted">Showing the network FAQ template. Customise to tailor answers to your shop.</p>
          )}
        </Section>
      )}

      {/* ══ TAB: Careers & delivery ═══════════════════════════════════ */}
      {tab === "Careers & delivery" && (
        <div className="space-y-5">
          <Section
            title="Delivery steps"
            description="How delivery works — bullets on the delivery page."
            actions={
              <CloneOrResetBar
                isOverridden={stepsList !== null}
                singular="steps"
                onClone={() => setDoc((prev) => ({ ...prev, deliverySteps: [...STOREFRONT_TEMPLATE.deliverySteps] }))}
                onReset={() => setDoc((prev) => ({ ...prev, deliverySteps: null }))}
              />
            }
          >
            {stepsList !== null ? (
              <StringListEditor
                items={stepsList}
                onChange={(next) => setDoc((prev) => ({ ...prev, deliverySteps: next.map((s) => s.trim()).filter(Boolean) }))}
                addLabel="Add step"
                max={8}
              />
            ) : (
              <ol className="list-inside list-decimal space-y-1 rounded-xl bg-black/10 p-4 text-xs admin-muted">
                {STOREFRONT_TEMPLATE.deliverySteps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            )}
          </Section>

          <Section
            title="Careers copy & roles"
            description="Heading shown above open roles."
            actions={
              <CloneOrResetBar
                isOverridden={"careers" in doc}
                singular="careers section"
                onClone={() => setDoc((prev) => ({ ...prev, careers: { ...(prev.careers || {}) } }))}
                onReset={() => setSection("careers", null)}
              />
            }
          >
            {("careers" in doc) && (
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <DocField label="Page heading" value={careers.heading ?? ""} placeholder={STOREFRONT_TEMPLATE.careers.heading} onChange={(v) => setSection("careers", { heading: v })} />
                <DocField label="Intro line" value={careers.description ?? ""} placeholder={STOREFRONT_TEMPLATE.careers.description} onChange={(v) => setSection("careers", { description: v })} />
              </div>
            )}
            {careersJobs !== null ? (
              <div className="space-y-4">
                {careersJobs.map((job, i) => (
                  <div key={`job-${i}`} className="rounded-xl border border-current p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold admin-muted">Role {i + 1}</p>
                      <button type="button" onClick={() => setDoc((prev) => ({ ...prev, careers: { ...(prev.careers || {}), jobs: (prev.careers.jobs as AnyDoc[]).filter((_, j) => j !== i) } }))} className="btn-icon btn-icon-admin hover:text-red-500" aria-label={`Remove role ${i + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input type="text" value={job.title ?? ""} placeholder="Title e.g. Staff Pharmacist (Full-time)" onChange={(e) => setJobs(i, { title: e.target.value })} className="input-admin sm:col-span-2" />
                      <input type="text" value={job.type ?? ""} placeholder="Type" onChange={(e) => setJobs(i, { type: e.target.value })} className="input-admin" />
                      <input type="text" value={job.location ?? ""} placeholder="Location" onChange={(e) => setJobs(i, { location: e.target.value })} className="input-admin" />
                    </div>
                    <textarea rows={2} value={job.summary ?? ""} placeholder="Summary" onChange={(e) => setJobs(i, { summary: e.target.value })} className="input-admin mt-2" />
                    <div className="mt-2">
                      <p className="label-admin">Requirements</p>
                      <StringListEditor
                        items={Array.isArray(job.requirements) ? job.requirements : []}
                        onChange={(next) => setJobs(i, { requirements: next.filter(Boolean) })}
                        addLabel="Add requirement"
                        max={10}
                      />
                    </div>
                  </div>
                ))}
                {careersJobs.length < 10 && (
                  <button type="button" onClick={() => setDoc((prev) => ({
                    ...prev,
                    careers: { ...(prev.careers || {}), jobs: [...(prev.careers?.jobs as AnyDoc[] || []), { id: `job-${Date.now()}`, title: "", type: "Full-time", location: slug || "" , posted: new Date().toISOString().slice(0, 10), summary: "", requirements: [] }] },
                  }))} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-current px-3 py-1.5 text-xs font-semibold admin-muted hover:admin-text">
                    <Plus className="h-3.5 w-3.5" /> Add role
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs admin-muted">{STOREFRONT_TEMPLATE.careers.jobs.length} template roles are listed.</p>
            )}
          </Section>
        </div>
      )}

      {/* ══ TAB: Brand & CTA ══════════════════════════════════════════ */}
      {tab === "Brand & CTA" && (
        <div className="space-y-5">
          <Section title="Accent colours" description="Tints buttons, gradients and glass highlights across every /p/* page. Blank keeps network teal.">
            <div className="grid gap-4 sm:grid-cols-2">
              {(["brandPrimary", "brandAccent"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="label-admin">{k === "brandPrimary" ? "Primary" : "Accent"} hex colour</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(brand[k] as string) || (k === "brandPrimary" ? "#0d6e5a" : "#0f766e")}
                      onChange={(e) => setSection("theme", { [k]: e.target.value })}
                      className="h-9 w-14 cursor-pointer rounded-lg border border-current bg-transparent p-1"
                      aria-label={`${k} picker`}
                    />
                    <input
                      type="text"
                      value={(brand[k] as string) ?? ""}
                      placeholder={k === "brandPrimary" ? "#0d6e5a" : "#0f766e"}
                      onChange={(e) => setSection("theme", { [k]: e.target.value })}
                      className="input-admin flex-1"
                    />
                    {(brand[k] as string | undefined) !== undefined && (
                      <button type="button" onClick={() => clearPathField("theme", k)} className="btn-icon btn-icon-admin hover:text-red-500" aria-label={`Clear ${k}`}>
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Social links" description="Blank entries fall back to the network's links.">
            <div className="grid gap-4 sm:grid-cols-3">
              {(["facebook", "instagram", "linkedin"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="label-admin capitalize">{k}</span>
                  <input
                    type="url"
                    value={(social[k] as string) ?? ""}
                    placeholder={`https://${k}.com/yourpharmacy`}
                    onChange={(e) => setSection("social", { [k]: e.target.value === "" ? null : e.target.value })}
                    className="input-admin"
                  />
                </label>
              ))}
            </div>
          </Section>

          <Section title="Certifications & credentials" description="Shown beside insurance and on the about page credentials bar.">
            <StringListEditor
              items={Array.isArray(doc.certifications) ? doc.certifications : [...STOREFRONT_TEMPLATE.certifications]}
              onChange={(next) =>
                setDoc((prev) => ({
                  ...prev,
                  certifications: listsEqual(next.filter(Boolean), STOREFRONT_TEMPLATE.certifications) ? null : next.filter(Boolean),
                }))
              }
              addLabel="Add credential"
              max={10}
            />
          </Section>

          <Section
            title="Closing call-to-action banner"
            actions={
              <CloneOrResetBar
                isOverridden={"ctaBanner" in doc}
                singular="banner"
                onClone={() => setDoc((prev) => ({ ...prev, ctaBanner: { ...(prev.ctaBanner || {}) } }))}
                onReset={() => setSection("ctaBanner", null)}
              />
            }
          >
            {("ctaBanner" in doc) ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <DocField label="Eyebrow" value={cta.eyebrow ?? ""} placeholder={STOREFRONT_TEMPLATE.ctaBanner.eyebrow} onChange={(v) => setSection("ctaBanner", { eyebrow: v })} />
                <DocField label="Title" value={cta.title ?? ""} placeholder={STOREFRONT_TEMPLATE.ctaBanner.title} onChange={(v) => setSection("ctaBanner", { title: v })} />
                <DocField label="Description" textarea value={cta.description ?? ""} placeholder={STOREFRONT_TEMPLATE.ctaBanner.description} onChange={(v) => setSection("ctaBanner", { description: v })} />
                <div className="grid gap-2">
                  <DocField label="Primary button label" value={cta.primary?.label ?? ""} placeholder={STOREFRONT_TEMPLATE.ctaBanner.primary.label} onChange={(v) => setSection("ctaBanner", { primary: { ...(cta.primary || {}), label: v } })} />
                  <DocField label="Primary button link" value={cta.primary?.href ?? ""} placeholder="/contact" onChange={(v) => setSection("ctaBanner", { primary: { ...(cta.primary || {}), href: v } })} />
                  <DocField label="Secondary button label" value={cta.secondary?.label ?? ""} placeholder={STOREFRONT_TEMPLATE.ctaBanner.secondary.label} onChange={(v) => setSection("ctaBanner", { secondary: { ...(cta.secondary || {}), label: v } })} />
                  <DocField label="Secondary button link" value={cta.secondary?.href ?? ""} placeholder="/refill" onChange={(v) => setSection("ctaBanner", { secondary: { ...(cta.secondary || {}), href: v } })} />
                </div>
              </div>
            ) : (
              <p className="text-xs admin-muted">Template banner shows “{STOREFRONT_TEMPLATE.ctaBanner.title}”.</p>
            )}
          </Section>

          <Section title="Insurance we welcome" description="Chips rendered inside the glass insurance strip.">
            <StringListEditor
              items={Array.isArray(doc.insurance) ? doc.insurance : [...STOREFRONT_TEMPLATE.insurance]}
              onChange={(next) =>
                setDoc((prev) => ({
                  ...prev,
                  insurance: listsEqual(next.filter(Boolean), STOREFRONT_TEMPLATE.insurance) ? null : next.filter(Boolean),
                }))
              }
              addLabel="Add insurer"
              max={14}
            />
            <p className="mt-2 text-xs admin-muted">
              {listsEqual(Array.isArray(doc.insurance) ? doc.insurance : [], STOREFRONT_TEMPLATE.insurance)
                ? "Matches the template list."
                : Array.isArray(doc.insurance)
                  ? "Custom list saved with your room."
                  : "Template list showing — edit above to override."}
            </p>
          </Section>
        </div>
      )}

      <div className="admin-card flex flex-wrap items-center justify-end gap-3 rounded-2xl border p-4">
        {slug && (
          <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer" className="mr-auto inline-flex items-center gap-1.5 text-xs font-semibold admin-muted hover:underline">
            <Eye className="h-3.5 w-3.5" /> Preview after save
          </a>
        )}
        <button type="submit" disabled={pending} className="btn-primary btn-primary-sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {pending ? "Saving…" : "Save & publish"}
        </button>
      </div>
    </form>
  );
}
