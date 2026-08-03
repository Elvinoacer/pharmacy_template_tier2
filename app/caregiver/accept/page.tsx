import Link from "next/link";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { createHash } from "crypto";

export const metadata = { title: "Accept caregiver invite" };

type InviteState =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "expired"; email: string }
  | { kind: "used"; email: string }
  | { kind: "valid"; inviteId: string; caregiverName: string; patientName: string; email: string };

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
    <main className="min-h-screen bg-[#f4f7f4] px-4 py-16">
      <section className="mx-auto max-w-lg rounded-3xl border border-[#e3ebe6] bg-white p-8 text-center shadow-sm">
        {state.kind === "valid" ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#0d6e5a]" />
            <h1 className="mt-4 text-2xl font-bold text-[#0c1a14]">Caregiver invitation</h1>
            <p className="mt-3 text-sm text-[#5a6b62]">
              Hi {state.caregiverName}, you&apos;ve been invited to help manage refills and pickup reminders for {state.patientName}.
            </p>
            <div className="mt-5 rounded-2xl bg-[#f0faf6] p-4 text-left text-sm text-[#0c1a14]">
              <p className="font-semibold">Invite email</p>
              <p className="mt-1 text-[#5a6b62]">{state.email}</p>
            </div>
            <p className="mt-5 text-xs text-[#5a6b62]">
              Account setup is not yet automated. Please contact the pharmacy and reference invite {state.inviteId.slice(0, 8)}.
            </p>
          </>
        ) : (
          <>
            {state.kind === "expired" ? (
              <Clock className="mx-auto h-12 w-12 text-amber-600" />
            ) : (
              <AlertCircle className="mx-auto h-12 w-12 text-rose-600" />
            )}
            <h1 className="mt-4 text-2xl font-bold text-[#0c1a14]">
              {state.kind === "expired" ? "Invite expired" : state.kind === "used" ? "Invite already accepted" : "Invalid invite link"}
            </h1>
            <p className="mt-3 text-sm text-[#5a6b62]">
              {state.kind === "expired"
                ? `This caregiver invitation for ${state.email} has expired. Ask the patient to send a new invite from their portal.`
                : state.kind === "used"
                  ? `This caregiver invitation for ${state.email} has already been used.`
                  : "We couldn't find a valid caregiver invitation for this link."}
            </p>
          </>
        )}
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-[#0d6e5a] px-4 py-2 text-sm font-semibold text-white">
          Go to sign in
        </Link>
      </section>
    </main>
  );
}
