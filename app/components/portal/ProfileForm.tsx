"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/portal";

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
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
      />
    </label>
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
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="text-sm text-rose-700">{state.error}</p>}
      {state?.success && <p className="text-sm text-teal-700">{state.success}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="fullName" defaultValue={profile.fullName} />
        <Field label="Phone" name="phone" defaultValue={profile.phone} type="tel" />
        <Field label="Date of birth" name="dateOfBirth" defaultValue={profile.dateOfBirth} type="date" />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Gender</span>
          <select
            name="gender"
            defaultValue={profile.gender}
            className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>
      </div>

      <Field label="Address line 1" name="addressLine1" defaultValue={profile.addressLine1} />
      <Field label="Address line 2" name="addressLine2" defaultValue={profile.addressLine2} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" name="city" defaultValue={profile.city} />
        <Field label="State / County" name="state" defaultValue={profile.state} />
        <Field label="ZIP / Postal" name="zip" defaultValue={profile.zip} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Preferred communication</span>
          <select
            name="preferredCommunication"
            defaultValue={profile.preferredCommunication}
            className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
          </select>
        </label>
        <Field label="Preferred branch" name="preferredBranch" defaultValue={profile.preferredBranch} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Emergency contact name"
          name="emergencyContactName"
          defaultValue={profile.emergencyContactName}
        />
        <Field
          label="Emergency contact phone"
          name="emergencyContactPhone"
          defaultValue={profile.emergencyContactPhone}
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary !py-2.5 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
