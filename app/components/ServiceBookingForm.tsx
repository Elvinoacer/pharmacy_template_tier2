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

import type { PaymentPolicy } from "@/app/lib/service-payment-policy";

type Props = {
  serviceId: string;
  serviceTitle: string;
  paymentPolicy: PaymentPolicy;
  price: number | null;
  defaultName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
};

const labelClass =
  "mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]";
const fieldClass =
  "w-full min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card-elev)] px-3.5 py-3 text-base text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_28%,transparent)] disabled:cursor-not-allowed disabled:bg-[color-mix(in_srgb,var(--foreground)_7%,var(--card))] disabled:text-[var(--muted)] disabled:opacity-100 sm:text-sm";

export function ServiceBookingForm({
  serviceId,
  serviceTitle,
  price,
  paymentPolicy,
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
  const requiresPayment = paymentPolicy === "ONLINE_REQUIRED";

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

  if (state?.success && state.bookingId) {
    return (
      <div className="min-w-0 space-y-4">
        <div
          className={`rounded-2xl border bg-[var(--card-elev)] p-4 text-center sm:p-6 ${
            state.requiresPayment
              ? "border-amber-700/60 dark:border-amber-200/50"
              : "border-emerald-700/60 dark:border-emerald-200/50"
          }`}
        >
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white ${
              state.requiresPayment ? "bg-amber-700" : "bg-emerald-700"
            }`}
          >
            {state.requiresPayment ? (
              <Smartphone className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Check className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
          <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
            {state.requiresPayment ? "Almost there — pay to confirm" : "Booking received"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{state.success}</p>
          <p className="mt-3 break-all font-mono text-sm font-bold text-[var(--brand)]">
            Ref: {state.bookingId.slice(0, 8).toUpperCase()}
          </p>
          {state.amount != null && state.amount > 0 && (
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              KES {state.amount.toLocaleString()}
            </p>
          )}
        </div>

        {state.requiresPayment && state.orderId && (
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card)] p-4 sm:p-5">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <ShieldCheck className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
              Confirm with M-Pesa
            </h4>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Complete payment to confirm your requested visit. Use the same phone you entered on the form.
            </p>
            <div className="mt-3 min-w-0">
              <MpesaPayButton
                orderId={state.orderId}
              accessToken={state.accessToken}
                defaultPhone={state.phone || defaultPhone}
                guestMode
              />
            </div>
          </div>
        )}

        {!state.requiresPayment && (
          <p className="rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--brand-tint)] p-4 text-sm leading-6 text-[var(--muted)]">
            {state.isPayableAfter ? "Payment is due at your visit. " : "No online payment is required. "}Our team will contact you on{" "}
            <strong className="break-words text-[var(--foreground)]">{state.phone || defaultPhone}</strong> to finalise timing.
          </p>
        )}

        {pushStatus === "on" ? (
          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--brand)]">
            <Bell className="h-3.5 w-3.5" aria-hidden="true" /> Push updates enabled for this booking
          </p>
        ) : pushStatus !== "unsupported" && pushStatus !== "denied" ? (
          <button
            type="button"
            onClick={enablePush}
            className="mx-auto flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:underline"
          >
            <Bell className="h-3.5 w-3.5" aria-hidden="true" /> Enable push updates
          </button>
        ) : null}
      </div>
    );
  }

  if (paymentPolicy === "UNAVAILABLE") return <p role="status" className="text-sm leading-6">This service requires online payment, which is currently unavailable. Please contact the pharmacy to arrange your visit.</p>;

  return (
    <form action={formAction} className="min-w-0 space-y-4">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="pushToken" value={pushToken} />

      <div className="min-w-0">
        <label htmlFor={`${fieldPrefix}-name`} className={labelClass}>
          <User className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden="true" /> Full name *
        </label>
        <input
          id={`${fieldPrefix}-name`}
          name="fullName"
          required
          autoComplete="name"
          defaultValue={defaultName}
          placeholder="Jane Wanjiku"
          className={fieldClass}
        />
      </div>

      <div className="min-w-0">
        <label htmlFor={`${fieldPrefix}-phone`} className={labelClass}>
          <Phone className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden="true" /> Phone *{" "}
          <span className="font-normal text-[var(--muted)]">(required for confirmation)</span>
        </label>
        <input
          id={`${fieldPrefix}-phone`}
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          defaultValue={defaultPhone}
          placeholder="+254 700 000 000"
          className={fieldClass}
        />
        <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">
          {requiresPayment
            ? "We’ll STK-push M-Pesa to this number to confirm your booking."
            : "We’ll call or WhatsApp this number about your visit."}
        </p>
      </div>

      <div className="min-w-0">
        <label htmlFor={`${fieldPrefix}-email`} className={labelClass}>
          <Mail className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden="true" /> Email{" "}
          <span className="font-normal text-[var(--muted)]">(optional)</span>
        </label>
        <input
          id={`${fieldPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          placeholder="you@example.com"
          className={fieldClass}
        />
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={`${fieldPrefix}-date`} className={labelClass}>
            <Calendar className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden="true" /> Preferred date
          </label>
          <input
            id={`${fieldPrefix}-date`}
            name="preferredDate"
            type="date"
            className={fieldClass}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${fieldPrefix}-time`} className={labelClass}>
            <Clock className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden="true" /> Preferred time
          </label>
          <input
            id={`${fieldPrefix}-time`}
            name="preferredTime"
            type="text"
            placeholder="e.g. Morning, 2pm"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="min-w-0">
        <label htmlFor={`${fieldPrefix}-notes`} className={labelClass}>
          <MessageSquare className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden="true" /> Notes{" "}
          <span className="font-normal text-[var(--muted)]">(optional)</span>
        </label>
        <textarea
          id={`${fieldPrefix}-notes`}
          name="notes"
          rows={3}
          placeholder="Anything we should know before your visit…"
          className={`${fieldClass} resize-y`}
        />
      </div>

      <div className="rounded-xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card-elev)] px-3.5 py-3 text-sm text-[var(--muted)]">
        {price != null && price > 0 ? (
          <>
            <span className="font-semibold text-[var(--foreground)]">KES {price!.toLocaleString()}</span>
            <span className="ml-1.5 text-xs leading-5">— {requiresPayment ? `payment confirms your ${serviceTitle} booking` : "pay at your visit; the pharmacy will confirm timing"}</span>
          </>
        ) : (
          <>No fixed fee listed — book freely and settle any charges in person if needed.</>
        )}
      </div>

      {pushStatus !== "on" && pushStatus !== "unsupported" && (
        <button
          type="button"
          onClick={enablePush}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card-elev)] px-3 py-2.5 text-xs font-semibold text-[var(--brand-deep)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)]"
        >
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          {pushStatus === "requesting"
            ? "Enabling notifications…"
            : pushStatus === "denied"
              ? "Notifications blocked in browser settings"
              : "Enable push updates for this booking"}
        </button>
      )}
      {pushStatus === "on" && (
        <p className="flex items-center gap-1.5 text-xs leading-5 text-[var(--brand)]">
          <Bell className="h-3.5 w-3.5" aria-hidden="true" /> Push updates on — we’ll notify you about this booking
        </p>
      )}

      {state?.error && (
        <p className="rounded-xl border border-rose-700/60 bg-rose-500/10 px-3 py-2.5 text-sm leading-5 text-rose-700 dark:border-rose-200/50 dark:text-rose-200" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 !py-3 text-sm disabled:cursor-not-allowed disabled:opacity-100 disabled:saturate-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
        {requiresPayment ? "Request & pay to confirm" : "Submit booking"}
      </button>
    </form>
  );
}
