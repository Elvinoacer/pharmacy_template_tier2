import Link from "next/link";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { createHash } from "crypto";
import { CaregiverAcceptForm } from "@/app/components/CaregiverAcceptForm";

export const metadata = { title: "Accept caregiver invite" };

type InviteState =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "expired"; email: string }
  | { kind: "used"; email: string }
  | {
      kind: "valid";
      inviteId: string;
      caregiverName: string;
      patientName: string;
      email: string;
      token: string;
    };

async function getInviteState(token?: string): Promise<InviteState> {
  if (!token) return { kind: "missing" };

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invite = await prisma.caregiverInvite.findUnique({
    where: { tokenHash },
    include: { caregiver: { include: { customer: { select: { fullName: true } } } } },
  });

  if (!invite) return { kind: "invalid" };
  if (invite.acceptedAt) return { kind: "used", email: invite.email };
  if (invite.expiresAt < new Date()) return { kind: "expired", email: invite.email };

  return {
    kind: "valid",
    inviteId: invite.id,
    caregiverName: invite.caregiver.caregiverName,
    patientName: invite.caregiver.customer.fullName,
    email: invite.email,
    token,
  };
}

export default async function CaregiverAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const state = await getInviteState(token);

  return (
    <main className="afyvia-artwork-surface afyvia-route-surface min-h-screen bg-transparent px-4 py-16">
      <section className="liquid-glass care-glass mx-auto max-w-lg rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-8 shadow-xl backdrop-blur-xl">
        {state.kind === "valid" ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--brand)]" />
            <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Caregiver invitation</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Hi {state.caregiverName}, you&apos;ve been invited to help manage refills and pickup
              reminders for <strong className="text-[var(--foreground)]">{state.patientName}</strong>.
            </p>
            <div className="mt-5 rounded-2xl border border-[var(--care-border)] bg-[var(--card)] p-4 text-left text-sm text-[var(--foreground)]">
              <p className="font-semibold text-[var(--foreground)]">Invite email</p>
              <p className="mt-1 text-[var(--muted)]">{state.email}</p>
            </div>
            <div className="mt-6 text-left">
              <CaregiverAcceptForm
                token={state.token}
                defaultName={state.caregiverName}
                email={state.email}
              />
            </div>
          </div>
        ) : (
          <div className="text-center">
            {state.kind === "expired" ? (
              <Clock className="mx-auto h-12 w-12 text-amber-600" />
            ) : (
              <AlertCircle className="mx-auto h-12 w-12 text-rose-600" />
            )}
            <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">
              {state.kind === "expired"
                ? "Invite expired"
                : state.kind === "used"
                  ? "Invite already accepted"
                  : "Invalid invite link"}
            </h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {state.kind === "expired"
                ? `This caregiver invitation for ${state.email} has expired. Ask the patient to send a new invite from their portal.`
                : state.kind === "used"
                  ? `This caregiver invitation for ${state.email} has already been used. Sign in to continue.`
                  : "We couldn't find a valid caregiver invitation for this link."}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-95"
            >
              Go to sign in
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
