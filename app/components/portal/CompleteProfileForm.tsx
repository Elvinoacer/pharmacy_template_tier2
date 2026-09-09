"use client";

import { useActionState } from "react";
import { completeOnboardingAction, type ActionState } from "@/app/actions/portal";
import styles from "@/app/portal/onboarding/Onboarding.module.css";

export default function CompleteProfileForm({
  fullName,
  phone,
  next,
}: {
  fullName: string;
  phone: string | null;
  next: string;
}) {
  const [state, action, pending] = useActionState(
    completeOnboardingAction,
    {} as ActionState
  );

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor="fullName" className={styles.label}>
          Your name <span className={styles.qualifier}>(required)</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          autoComplete="name"
          required
          maxLength={120}
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="phone" className={styles.label}>
          Phone number <span className={styles.qualifier}>(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={phone || ""}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          aria-describedby="phone-help"
          placeholder="e.g. 0712 345 678"
          className={styles.input}
        />
        <p id="phone-help" className={styles.help}>
          Add a number your pharmacy can use to contact you about your care.
        </p>
      </div>

      <button disabled={pending} className={styles.submit}>
        {pending ? "Saving your profile…" : "Save and continue"}
      </button>
    </form>
  );
}
