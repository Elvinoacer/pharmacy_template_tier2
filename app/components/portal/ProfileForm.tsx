"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/portal";
import { Check, AlertCircle, Save } from "lucide-react";

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
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
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
        className="input-premium"
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
    <fieldset className="rounded-2xl border border-[#e3ebe6] bg-[#fafbfa] p-4">
      <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-[#5a6b62]">
        {title}
      </legend>
      {description && <p className="mb-3 -mt-1 px-2 text-xs text-[#8a9a92]">{description}</p>}
      <div className="space-y-4">{children}</div>
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

      <Section title="Personal information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="fullName" defaultValue={profile.fullName} placeholder="Jane Doe" required />
          <Field label="Phone" name="phone" type="tel" defaultValue={profile.phone} placeholder="+1 (555) 555-5555" />
          <Field label="Date of birth" name="dateOfBirth" type="date" defaultValue={profile.dateOfBirth} />
          <label className="block">
            <span className="label-premium">Gender</span>
            <select
              name="gender"
              defaultValue={profile.gender}
              className="input-premium"
            >
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title="Mailing address" description="Used for delivery refills">
        <Field label="Address line 1" name="addressLine1" defaultValue={profile.addressLine1} placeholder="123 Main Street" />
        <Field label="Address line 2" name="addressLine2" defaultValue={profile.addressLine2} placeholder="Apt, suite, etc." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" name="city" defaultValue={profile.city} placeholder="Austin" />
          <Field label="State / County" name="state" defaultValue={profile.state} placeholder="TX" />
          <Field label="ZIP / Postal" name="zip" defaultValue={profile.zip} placeholder="78701" />
        </div>
      </Section>

      <Section title="Communication preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label-premium">Preferred channel</span>
            <select
              name="preferredCommunication"
              defaultValue={profile.preferredCommunication}
              className="input-premium"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
            </select>
          </label>
          <Field label="Preferred branch" name="preferredBranch" defaultValue={profile.preferredBranch} />
        </div>
      </Section>

      <Section title="Emergency contact" description="Who we should reach if we can't reach you">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" name="emergencyContactName" defaultValue={profile.emergencyContactName} placeholder="Maria Alvarez" />
          <Field label="Contact phone" name="emergencyContactPhone" type="tel" defaultValue={profile.emergencyContactPhone} placeholder="+1 (555) 555-5555" />
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="reset"
          className="btn-ghost"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
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
