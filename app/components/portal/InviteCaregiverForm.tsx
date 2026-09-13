"use client";

import { useState, useEffect, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import { inviteCaregiverAction } from "@/app/actions/portal";
import { toast } from "@/app/components/Toaster";

export function InviteCaregiverForm({
  caregiverId,
  cooldownRemainingSeconds = 0,
}: {
  caregiverId: string;
  cooldownRemainingSeconds?: number;
}) {
  const [remaining, setRemaining] = useState(cooldownRemainingSeconds);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (remaining > 0 || pending) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await inviteCaregiverAction(fd);
        toast.success("Invitation email sent.");
        setRemaining(
          Number(
            process.env.NEXT_PUBLIC_CAREGIVER_INVITE_COOLDOWN_SECONDS ||
              process.env.NEXT_PUBLIC_CAREGIVER_INVITE_COOLDOWN ||
              60,
          ),
        );
      } catch {
        toast.error("Could not send invite. Try again shortly.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="id" value={caregiverId} />
      <button
        type="submit"
        disabled={remaining > 0 || pending}
        className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ef] px-2 py-0.5 text-[10px] font-semibold text-[#0d6e5a] transition hover:bg-[#d5efe6] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        title="Send invite email so they can set up their caregiver account"
      >
        {pending ? (
          <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Sending…</>
        ) : (
          <><Send className="h-2.5 w-2.5" /> {remaining > 0 ? `Resend in ${remaining}s` : "Send invite link"}</>
        )}
      </button>
    </form>
  );
}