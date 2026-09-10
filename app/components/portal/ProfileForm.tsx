"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/app/actions/portal";
import { Check, AlertCircle, Save } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { localTodayStr } from "@/app/lib/time";
import CustomerLocationCapture from "@/app/components/location/CustomerLocationCapture";

type Profile = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  preferredCommunication: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredBranch: string;
};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
  max,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  max?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="label-premium">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        max={max}
        className="input-premium min-h-11 w-full min-w-0"
      />
    </label>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-2xl border border-[#e3ebe6] bg-[#fafbfa] p-3.5 dark:border-white/10 dark:bg-white/[0.025] sm:p-4">
      <legend className="max-w-full px-2 text-xs font-semibold uppercase tracking-wide text-[#5a6b62] dark:text-slate-400">
        {title}
      </legend>
      {description && <p className="mb-3 -mt-1 break-words px-2 text-xs leading-relaxed text-[#8a9a92] dark:text-slate-500">{description}</p>}
      <div className="min-w-0 space-y-4">{children}</div>
    </fieldset>
  );
}

export default function ProfileForm({
  action,
  profile,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  profile: Profile;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const lastSuccess = useRef<string | null>(null);

  useEffect(() => {
    if (state?.success && lastSuccess.current !== state.success) {
      lastSuccess.current = state.success;
      toast.success(state.success);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state?.success]);

  const today = localTodayStr();

  return (
    <form action={formAction} className="min-w-0 space-y-5">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{state.success}</span>
        </div>
      )}

      <Section title="Personal information">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label="Full name" name="fullName" defaultValue={profile.fullName} placeholder="Jane Doe" required />
          <Field label="Phone" name="phone" type="tel" defaultValue={profile.phone} placeholder="+1 (555) 555-5555" />
          <Field label="Date of birth" name="dateOfBirth" type="date" defaultValue={profile.dateOfBirth} max={today} />
          <label className="block min-w-0">
            <span className="label-premium">Gender</span>
            <select name="gender" defaultValue={profile.gender} className="input-premium min-h-11 w-full min-w-0">
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
        </div>
      </Section>

      <CustomerLocationCapture />

      <Section title="Mailing address" description="Used for delivery refills">
        <Field label="Address line 1" name="addressLine1" defaultValue={profile.addressLine1} placeholder="123 Main Street" />
        <Field label="Address line 2" name="addressLine2" defaultValue={profile.addressLine2} placeholder="Apt, suite, etc." />
        <div className="grid min-w-0 gap-4 sm:grid-cols-3">
          <Field label="City" name="city" defaultValue={profile.city} placeholder="Nairobi" />
          <Field label="State / County" name="state" defaultValue={profile.state} placeholder="TX" />
          <Field label="ZIP / Postal" name="zip" defaultValue={profile.zip} placeholder="78701" />
        </div>
      </Section>

      <Section title="Communication preferences">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="label-premium">Preferred channel</span>
            <select name="preferredCommunication" defaultValue={profile.preferredCommunication} className="input-premium min-h-11 w-full min-w-0">
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
            </select>
          </label>
          <Field label="Preferred branch (optional)" name="preferredBranch" defaultValue={profile.preferredBranch} placeholder="e.g. Westlands counter" />
        </div>
      </Section>

      <Section title="Emergency contact" description="Who we should reach if we can't reach you">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label="Contact name" name="emergencyContactName" defaultValue={profile.emergencyContactName} placeholder="Maria Alvarez" />
          <Field label="Contact phone" name="emergencyContactPhone" type="tel" defaultValue={profile.emergencyContactPhone} placeholder="+1 (555) 555-5555" />
        </div>
      </Section>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <button type="reset" className="btn-ghost min-h-11 w-full sm:w-auto">Reset</button>
        <button type="submit" disabled={pending} className="btn-primary min-h-11 w-full disabled:opacity-60 sm:w-auto">
          {pending ? (
            <>
              <span className="typing-dot" /> Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save profile
            </>
          )}
        </button>
      </div>
    </form>
  );
}
