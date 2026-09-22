"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { ExternalLink, Loader2, Save, Store } from "lucide-react";

import {
  saveBasicStorefrontAction,
  type StorefrontActionState,
} from "@/app/actions/storefront";
import { toast } from "@/app/components/Toaster";

const initialState: StorefrontActionState = {};

export default function BasicStorefrontForm({
  slug,
  basics,
}: {
  slug: string | null;
  basics: {
    tagline: string;
    about: string;
    logoUrl: string;
    deliveryNotes: string;
    deliveryFeeKes: string;
    deliveryRadiusKm: string;
  };
}) {
  const [state, action, pending] = useActionState(saveBasicStorefrontAction, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <section className="admin-card rounded-2xl border border-[var(--admin-border)] p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] admin-accent-text">
              <Store className="h-3.5 w-3.5" />
              Free storefront basics
            </div>
            <h2 className="mt-3 text-base font-bold admin-text">Keep your pharmacy identity accurate</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 admin-muted">
              Your logo, short positioning, pharmacy description and delivery basics remain editable on Free.
            </p>
          </div>
          {slug ? (
            <Link
              href={`/p/${slug}`}
              target="_blank"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-text"
            >
              View storefront
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {(state.error || state.success) && (
          <div
            className={`mt-4 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
              state.error
                ? "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {state.error || state.success}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Logo URL
            <input
              name="logoUrl"
              type="url"
              defaultValue={basics.logoUrl}
              className="input-admin mt-1.5 w-full"
              placeholder="https://…"
            />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Short tagline
            <input
              name="tagline"
              defaultValue={basics.tagline}
              maxLength={200}
              className="input-admin mt-1.5 w-full"
              placeholder="Trusted care, close to home"
            />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            About the pharmacy
            <textarea
              name="about"
              defaultValue={basics.about}
              rows={5}
              maxLength={1200}
              className="input-admin mt-1.5 w-full resize-y"
              placeholder="Tell patients what your pharmacy is known for."
            />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Delivery note
            <textarea
              name="deliveryNotes"
              defaultValue={basics.deliveryNotes}
              rows={3}
              maxLength={600}
              className="input-admin mt-1.5 w-full resize-y"
              placeholder="Optional delivery instructions shown to patients."
            />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            Delivery fee (KES)
            <input
              name="deliveryFeeKes"
              inputMode="decimal"
              defaultValue={basics.deliveryFeeKes}
              className="input-admin mt-1.5 w-full"
              placeholder="0"
            />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            Delivery radius (km)
            <input
              name="deliveryRadiusKm"
              inputMode="decimal"
              defaultValue={basics.deliveryRadiusKm}
              className="input-admin mt-1.5 w-full"
              placeholder="5"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="btn-admin min-h-11 !rounded-xl px-4 disabled:cursor-wait disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Saving…" : "Save free storefront basics"}
          </button>
        </div>
      </section>
    </form>
  );
}
