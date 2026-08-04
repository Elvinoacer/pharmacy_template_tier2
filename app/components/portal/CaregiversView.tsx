"use client";

import { useActionState } from "react";
import { addCaregiverAction, removeCaregiverAction, restoreCaregiverAction, type ActionState } from "@/app/actions/portal";
import { Panel } from "@/app/components/portal/PortalShell";
import {
  UserPlus,
  Mail,
  Phone,
  Users,
  Pill,
  Bell,
  X,
  Check,
  AlertCircle,
  RotateCcw,
  Activity,
} from "lucide-react";
import { InviteCaregiverForm } from "@/app/components/portal/InviteCaregiverForm";

type Caregiver = {
  id: string;
  caregiverName: string;
  caregiverEmail: string | null;
  caregiverPhone: string | null;
  relationship: string | null;
  canRequestRefills: boolean;
  canReceivePickupNotifications: boolean;
  canLogAdherence: boolean;
  status: string;
  cooldownRemainingSeconds?: number;
  inviteSendCount?: number;
};

const AVATAR_COLORS = [
  "from-pink-400 to-rose-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-blue-400 to-indigo-500",
  "from-purple-400 to-fuchsia-500",
  "from-cyan-400 to-sky-500",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function CaregiversView({ caregivers }: { caregivers: Caregiver[] }) {
  const [state, formAction, pending] = useActionState(addCaregiverAction, {} as ActionState);
  const active = caregivers.filter((c) => c.status === "active");
  const revoked = caregivers.filter((c) => c.status === "revoked");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel
        title="Authorised caregivers"
        description={`${active.length} active carer${active.length === 1 ? "" : "s"}`}
      >
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e3ebe6] px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f4ef] text-[#0d6e5a]">
              <Users className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#0c1a14]">No caregivers yet</p>
            <p className="mt-1 max-w-xs text-xs text-[#5a6b62]">
              Use the form on the right to add a family member or carer.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {active.map((c) => {
              const initials = c.caregiverName
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase())
                .join("");
              return (
                <li
                  key={c.id}
                  className="group flex items-start gap-3 rounded-xl border border-[#e3ebe6] bg-white p-3.5 transition hover:border-[#0d6e5a]/30"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor(
                      c.caregiverName,
                    )} text-xs font-bold text-white`}
                  >
                    {initials || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#0c1a14]">{c.caregiverName}</p>
                    <p className="text-xs text-[#5a6b62]">{c.relationship || "Caregiver"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.caregiverEmail && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7f4] px-2 py-0.5 text-[10px] text-[#5a6b62]">
                          <Mail className="h-2.5 w-2.5" /> {c.caregiverEmail}
                        </span>
                      )}
                      {c.caregiverPhone && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7f4] px-2 py-0.5 text-[10px] text-[#5a6b62]">
                          <Phone className="h-2.5 w-2.5" /> {c.caregiverPhone}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <PermissionChip
                        ok={c.canRequestRefills}
                        okLabel="Can request refills"
                        notOkLabel="No refill requests"
                        icon={Pill}
                      />
                      <PermissionChip
                        ok={c.canReceivePickupNotifications}
                        okLabel="Pickup alerts"
                        notOkLabel="No pickup alerts"
                        icon={Bell}
                      />
                      <PermissionChip
                        ok={c.canLogAdherence}
                        okLabel="Can log adherence"
                        notOkLabel="No adherence logging"
                        icon={Activity}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.caregiverEmail && (
                        <InviteCaregiverForm
                          caregiverId={c.id}
                          cooldownRemainingSeconds={c.cooldownRemainingSeconds}
                        />
                      )}
                    </div>
                  </div>
                  <form action={removeCaregiverAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="rounded-full p-1.5 text-[#8a9a92] opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                      title="Revoke caregiver"
                      aria-label="Revoke"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        {/* Revoked caregivers — with undo */}
        {revoked.length > 0 && (
          <div className="mt-6 border-t border-[#e3ebe6] pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8a9a92]">
              Revoked ({revoked.length})
            </p>
            <ul className="space-y-2">
              {revoked.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-[#e3ebe6] bg-[#fafbfa] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#5a6b62] line-through">{c.caregiverName}</p>
                    {c.caregiverEmail && (
                      <p className="truncate text-[10px] text-[#8a9a92]">{c.caregiverEmail}</p>
                    )}
                  </div>
                  <form action={restoreCaregiverAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ef] px-2 py-1 text-[10px] font-semibold text-[#0d6e5a] transition hover:bg-[#d5efe6]"
                      title="Restore caregiver"
                    >
                      <RotateCcw className="h-3 w-3" /> Restore
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel
        title="Add a caregiver"
        description="They'll receive an invitation and access to the permissions you grant"
      >
        <form action={formAction} className="space-y-4">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-premium">Full name *</label>
              <input
                name="caregiverName"
                required
                placeholder="e.g. Maria Alvarez"
                className="input-premium"
              />
            </div>
            <div>
              <label className="label-premium">Relationship</label>
              <input
                name="relationship"
                placeholder="e.g. Spouse"
                className="input-premium"
              />
            </div>
            <div>
              <label className="label-premium">Email</label>
              <input
                name="caregiverEmail"
                type="email"
                placeholder="caregiver@email.com"
                className="input-premium"
              />
            </div>
            <div>
              <label className="label-premium">Phone</label>
              <input
                name="caregiverPhone"
                type="tel"
                placeholder="+1 (555) 555-5555"
                className="input-premium"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-[#f4f7f4] p-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="canRequestRefills"
                defaultChecked
                className="h-4 w-4 rounded border-[#5a6b62] text-[#0d6e5a] focus:ring-[#0d6e5a]"
              />
              <Pill className="h-4 w-4 text-[#0d6e5a]" />
              <span>
                <span className="font-medium text-[#0c1a14]">Request refills</span>
                <span className="block text-xs text-[#5a6b62]">Submit refill requests on your behalf</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="canReceivePickupNotifications"
                defaultChecked
                className="h-4 w-4 rounded border-[#5a6b62] text-[#0d6e5a] focus:ring-[#0d6e5a]"
              />
              <Bell className="h-4 w-4 text-[#0d6e5a]" />
              <span>
                <span className="font-medium text-[#0c1a14]">Pickup notifications</span>
                <span className="block text-xs text-[#5a6b62]">Receive alerts when your prescription is ready</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="canLogAdherence"
                defaultChecked
                className="h-4 w-4 rounded border-[#5a6b62] text-[#0d6e5a] focus:ring-[#0d6e5a]"
              />
              <Activity className="h-4 w-4 text-[#0d6e5a]" />
              <span>
                <span className="font-medium text-[#0c1a14]">Log adherence</span>
                <span className="block text-xs text-[#5a6b62]">Mark your doses as taken/missed on your behalf</span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full disabled:opacity-60"
          >
            {pending ? (
              <>
                <span className="typing-dot" /> Saving…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Add caregiver
              </>
            )}
          </button>
        </form>
      </Panel>
    </div>
  );
}

function PermissionChip({
  ok,
  okLabel,
  notOkLabel,
  icon: Icon,
}: {
  ok: boolean;
  okLabel: string;
  notOkLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        ok
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
      <Icon className="h-2.5 w-2.5" />
      {ok ? okLabel : notOkLabel}
    </span>
  );
}
