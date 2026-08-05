"use client";

import { useState } from "react";
import PasswordField from "@/app/components/PasswordField";

/** Client wrapper so confirm-password can live-compare against the new password. */
export default function ResetPasswordFields() {
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-4">
      <PasswordField
        label="New password"
        name="password"
        required
        autoComplete="new-password"
        placeholder="Create a strong password"
        showRequirements
        onValueChange={(value) => setPassword(value)}
      />
      <PasswordField
        label="Confirm password"
        name="confirm"
        required
        autoComplete="new-password"
        placeholder="Re-enter password"
        matchValue={password}
      />
    </div>
  );
}
