"use client";

import { useActionState, useState } from "react";
import { portalFeedbackAction, type ActionState } from "@/app/actions/portal";
import {
  Star,
  Lightbulb,
  AlertTriangle,
  Smile,
  Check,
  AlertCircle,
  Send,
} from "lucide-react";

const TYPES = [
  { value: "review", label: "Review", icon: Star, color: "amber" },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb, color: "blue" },
  { value: "complaint", label: "Complaint", icon: AlertTriangle, color: "rose" },
  { value: "satisfaction", label: "Satisfaction", icon: Smile, color: "emerald" },
] as const;

const COLOR_MAP: Record<string, { active: string; idle: string }> = {
  amber: {
    active: "border-amber-400 bg-amber-50 text-amber-700",
    idle: "border-[#e3ebe6] hover:border-amber-300 text-[#5a6b62]",
  },
  blue: {
    active: "border-blue-400 bg-blue-50 text-blue-700",
    idle: "border-[#e3ebe6] hover:border-blue-300 text-[#5a6b62]",
  },
  rose: {
    active: "border-rose-400 bg-rose-50 text-rose-700",
    idle: "border-[#e3ebe6] hover:border-rose-300 text-[#5a6b62]",
  },
  emerald: {
    active: "border-emerald-400 bg-emerald-50 text-emerald-700",
    idle: "border-[#e3ebe6] hover:border-emerald-300 text-[#5a6b62]",
  },
};

export default function FeedbackForm() {
  const [state, formAction, pending] = useActionState(portalFeedbackAction, {} as ActionState);
  const [type, setType] = useState<string>("review");
  const [rating, setRating] = useState<number>(5);
  const [hover, setHover] = useState<number>(0);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      {/* Type picker */}
      <div>
        <span className="label-premium">Type of feedback</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const colors = COLOR_MAP[t.color];
            const active = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-semibold transition ${active ? colors.active : colors.idle}`}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="type" value={type} />
      </div>

      {/* Star rating */}
      <div>
        <span className="label-premium">Rating</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= (hover || rating);
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="rounded-md p-1 transition hover:bg-amber-50"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                <Star
                  className={`h-7 w-7 transition ${filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-slate-300"}`}
                />
              </button>
            );
          })}
          <span className="ml-2 text-sm font-medium text-[#5a6b62]">
            {rating}/5
          </span>
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>

      {/* Title */}
      <label className="block">
        <span className="label-premium">Title <span className="text-[#8a9a92]">(optional)</span></span>
        <input
          name="title"
          placeholder="Briefly summarise your feedback"
          className="input-premium"
        />
      </label>

      {/* Body */}
      <label className="block">
        <span className="label-premium">
          Your feedback <span className="text-rose-500">*</span>
        </span>
        <textarea
          name="body"
          required
          rows={5}
          placeholder="Tell us more about your experience…"
          className="input-premium resize-y"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full disabled:opacity-60"
      >
        {pending ? (
          <>
            <span className="typing-dot" /> Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Submit feedback
          </>
        )}
      </button>
    </form>
  );
}
