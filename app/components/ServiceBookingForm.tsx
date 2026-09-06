"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  bookServiceAction,
  type ServiceBookingState,
} from "@/app/actions/service-booking";
import { toast } from "@/app/components/Toaster";
import { MpesaPayButton } from "@/app/components/portal/MpesaPayButton";
import {
  Bell,
  Calendar,
  Check,
  Clock,
  Loader2,
  Phone,
  Send,
  Smartphone,
  User,
  Mail,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { isPushSupported, requestFcmToken } from "@/app/lib/firebase/client";

type Props = {
  serviceId: string;
  serviceTitle: string;
  /** When set, payment is required to confirm. */
  price: number | null;
  defaultName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
};

export function ServiceBookingForm({
  serviceId,
  serviceTitle,
  price,
  defaultName = "",
  defaultPhone = "",
  defaultEmail = "",
}: Props) {
  const fieldPrefix = useId();
  const [state, formAction, pending] = useActionState(
    bookServiceAction,
    {} as ServiceBookingState,
  );
  const [pushToken, setPushToken] = useState("");
  const [pushStatus, setPushStatus] = useState<
    "idle" | "requesting" | "on" | "denied" | "unsupported"
  >("idle");
  const askedRef = useRef(false);
  const requiresPayment = price != null && price > 0;

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  // Soft-enable push once so the customer can get booking updates. Browser
  // capability and Notification.permission are external state, so defer the
  // synchronization until after paint instead of cascading state in the effect.
  useEffect(() => {
    if (askedRef.current) return;
    askedRef.current = true;

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      if (!isPushSupported()) {
        setPushStatus("unsupported");
        return;
      }
      if (Notification.permission !== "granted") return;

      setPushStatus("requesting");
      void requestFcmToken()
        .then((token) => {
          if (cancelled) return;
          if (token) {
            setPushToken(token);
            setPushStatus("on");
          } else {
            setPushStatus("idle");
          }
        })
        .catch(() => {
          if (!cancelled) setPushStatus("idle");
        });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  async function enablePush() {
    if (!isPushSupported()) {
      setPushStatus("unsupported");
      return;
    }
    setPushStatus("requesting");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        return;
      }
      const token = await requestFcmToken();
      if (token) {
        setPushToken(token);
        setPushStatus("on");
        toast.success("You’ll get a notification when your booking updates.");
      } else {
        setPushStatus("idle");
      }
    } catch {
      setPushStatus("idle");
    }
  }

  // Success states
  if (state?.success && state.bookingId) {
    return (
      <div className="space-y-4">
        <div
          className={`rounded-2xl border p-6 text-center ${
            state.requiresPayment
              ? "border-amber-200 bg-amber-50/80"
              : "border-emerald-200 bg-emerald-50/80"
          }`}
        >
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white ${
              state.requiresPayment ? "bg-amber-600" : "bg-emerald-600"
            }`}
          >
            {state.requiresPayment ? (
              <Smartphone className="h-6 w-6" />
            ) : (
              <Check className="h-6 w-6" />
            )}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[#0c1a14]">
            {state.requiresPayment ? "Almost there — pay to confirm" : "Booking received"}
          </h3>
          <p className="mt-2 text-sm text-[#5a6b62]">{state.success}</p>
          <p className="mt-3 font-mono text-sm font-bold text-teal-800">
            Ref: {state.bookingId.slice(0, 8).toUpperCase()}
          </p>
          {state.amount != null && state.amount > 0 && (
            <p className="mt-1 text-sm font-semibold text-[#0c1a14]">
              KES {state.amount.toLocaleString()}
            </p>
          )}
        </div>

        {state.requiresPayment && state.orderId && (
          <div className="rounded-2xl border border-[#e3ebe6] bg-white p-5">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[#0c1a14]">
              <ShieldCheck className="h-4 w-4 text-[#0d6e5a]" />
              Confirm with M-Pesa
            </h4>
            <p className="mt-1 text-xs text-[#5a6b62]">
              Your slot is held only after payment succeeds. Use the same phone you entered
              on the form.
            </p>
            <div className="mt-3">
              <MpesaPayButton
                orderId={state.orderId}
                defaultPhone={state.phone || defaultPhone}
                guestMode
              />
            </div>
          </div>
        )}

        {!state.requiresPayment && (
          <p className="rounded-2xl border border-teal-100 bg-[#f0faf6] p-4 text-sm text-[#5a6b62]">
            No payment is required for this service. Our team will contact you on{" "}
            <strong className="text-[#0c1a14]">{state.phone || defaultPhone}</strong> to
            finalise timing.
          </p>
        )}

        {pushStatus === "on" ? (
          <p className="flex items-center justify-center gap-1.5 text-xs text-emerald-700">
            <Bell className="h-3.5 w-3.5" /> Push updates enabled for this booking
          </p>
        ) : pushStatus !== "unsupported" && pushStatus !== "denied" ? (
          <button
            type="button"
            onClick={enablePush}
            className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:underline"
          >
            <Bell className="h-3.5 w-3.5" /> Enable push updates
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="pushToken" value={pushToken} />

      <div>
        <label htmlFor={`${fieldPrefix}-name`} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#0c1a14]">
          <User className="h-3.5 w-3.5 text-teal-700" /> Full name *
        </label>
        <input
          id={`${fieldPrefix}-name`}
          name="fullName"
          required
          defaultValue={defaultName}
          placeholder="Jane Wanjiku"
          className="w-full rounded-xl border border-[#d7e3dc] bg-white px-3.5 py-2.5 text-sm outline-none ring-teal-700/20 focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor={`${fieldPrefix}-phone`} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#0c1a14]">
          <Phone className="h-3.5 w-3.5 text-teal-700" /> Phone *{" "}
          <span className="font-normal text-[#5a6b62]">(required for confirmation)</span>
        </label>
        <input
          id={`${fieldPrefix}-phone`}
          name="phone"
          type="tel"
          required
          defaultValue={defaultPhone}
          placeholder="07XX XXX XXX"
          className="w-full rounded-xl border border-[#d7e3dc] bg-white px-3.5 py-2.5 text-sm outline-none ring-teal-700/20 focus:ring-2"
        />
        <p className="mt-1 text-[11px] text-[#5a6b62]">
          {requiresPayment
            ? "We’ll STK-push M-Pesa to this number to confirm your booking."
            : "We’ll call or WhatsApp this number about your visit."}
        </p>
      </div>

      <div>
        <label htmlFor={`${fieldPrefix}-email`} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#0c1a14]">
          <Mail className="h-3.5 w-3.5 text-teal-700" /> Email{" "}
          <span className="font-normal text-[#5a6b62]">(optional)</span>
        </label>
        <input
          id={`${fieldPrefix}-email`}
          name="email"
          type="email"
          defaultValue={defaultEmail}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-[#d7e3dc] bg-white px-3.5 py-2.5 text-sm outline-none ring-teal-700/20 focus:ring-2"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${fieldPrefix}-date`} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#0c1a14]">
            <Calendar className="h-3.5 w-3.5 text-teal-700" /> Preferred date
          </label>
          <input
            id={`${fieldPrefix}-date`}
            name="preferredDate"
            type="date"
            className="w-full rounded-xl border border-[#d7e3dc] bg-white px-3.5 py-2.5 text-sm outline-none ring-teal-700/20 focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor={`${fieldPrefix}-time`} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#0c1a14]">
            <Clock className="h-3.5 w-3.5 text-teal-700" /> Preferred time
          </label>
          <input
            id={`${fieldPrefix}-time`}
            name="preferredTime"
            type="text"
            placeholder="e.g. Morning, 2pm"
            className="w-full rounded-xl border border-[#d7e3dc] bg-white px-3.5 py-2.5 text-sm outline-none ring-teal-700/20 focus:ring-2"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${fieldPrefix}-notes`} className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#0c1a14]">
          <MessageSquare className="h-3.5 w-3.5 text-teal-700" /> Notes{" "}
          <span className="font-normal text-[#5a6b62]">(optional)</span>
        </label>
        <textarea
          id={`${fieldPrefix}-notes`}
          name="notes"
          rows={3}
          placeholder="Anything we should know before your visit…"
          className="w-full resize-y rounded-xl border border-[#d7e3dc] bg-white px-3.5 py-2.5 text-sm outline-none ring-teal-700/20 focus:ring-2"
        />
      </div>

      <div
        className={`rounded-xl border px-3.5 py-3 text-sm ${
          requiresPayment
            ? "border-teal-200 bg-teal-50/70 text-[#0c1a14]"
            : "border-[#e3ebe6] bg-[#f7faf8] text-[#5a6b62]"
        }`}
      >
        {requiresPayment ? (
          <>
            <span className="font-semibold">KES {price!.toLocaleString()}</span>
            <span className="ml-1.5 text-xs">
              — payment confirms your {serviceTitle} booking
            </span>
          </>
        ) : (
          <>No fixed fee listed — book freely and settle any charges in person if needed.</>
        )}
      </div>

      {pushStatus !== "on" && pushStatus !== "unsupported" && (
        <button
          type="button"
          onClick={enablePush}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300/60 bg-white px-3 py-2.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-50"
        >
          <Bell className="h-3.5 w-3.5" />
          {pushStatus === "requesting"
            ? "Enabling notifications…"
            : pushStatus === "denied"
              ? "Notifications blocked in browser settings"
              : "Enable push updates for this booking"}
        </button>
      )}
      {pushStatus === "on" && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-700">
          <Bell className="h-3.5 w-3.5" /> Push updates on — we’ll notify you about this booking
        </p>
      )}

      {state?.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary flex w-full items-center justify-center gap-2 !py-3 text-sm disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {requiresPayment ? "Request & pay to confirm" : "Submit booking"}
      </button>
    </form>
  );
}
