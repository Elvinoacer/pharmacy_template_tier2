"use client";

import { useActionState } from "react";
import { portalFeedbackAction, type ActionState } from "@/app/actions/portal";

export default function FeedbackForm() {
  const [state, formAction, pending] = useActionState(portalFeedbackAction, {} as ActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="text-sm text-rose-700">{state.error}</p>}
      {state?.success && <p className="text-sm text-teal-700">{state.success}</p>}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Type</span>
        <select name="type" className="w-full rounded-2xl border border-teal-900/10 px-4 py-3 text-sm">
          <option value="review">Review</option>
          <option value="suggestion">Suggestion</option>
          <option value="complaint">Complaint</option>
          <option value="satisfaction">Satisfaction</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Rating (1–5)</span>
        <select
          name="rating"
          defaultValue="5"
          className="w-full rounded-2xl border border-teal-900/10 px-4 py-3 text-sm"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Title</span>
        <input name="title" className="w-full rounded-2xl border border-teal-900/10 px-4 py-3 text-sm" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Your feedback *</span>
        <textarea
          name="body"
          required
          rows={4}
          className="w-full rounded-2xl border border-teal-900/10 px-4 py-3 text-sm"
        />
      </label>
      <button type="submit" disabled={pending} className="btn-primary !py-2.5 text-sm disabled:opacity-60">
        {pending ? "Sending…" : "Submit feedback"}
      </button>
    </form>
  );
}
