"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  administerVaccinationAction,
  updateAppointmentStatusAction,
  completeObservationAction,
  recordAefiAction,
  completeCounsellingAction,
  saveCredentialAction,
  savePolicyAction,
  createCampaignAction,
  type VaccinationActionState,
} from "@/app/actions/vaccination";
import { toast } from "@/app/components/Toaster";
import { COUNSELLING_TOPICS } from "@/app/lib/vaccination-catalog";
import {
  AlertTriangle,
  CalendarCheck,
  ClipboardList,
  Loader2,
  Megaphone,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react";

type VaccineRow = {
  id: string;
  slug: string;
  name: string;
  antigen: string;
  route: string;
  siteOptions: string[];
  doseMl: number | null;
  visVersion: string | null;
  pharmacyAdministered: boolean;
  priceKes: number | null;
};

type AppointmentRow = {
  id: string;
  status: string;
  source: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  patientDob: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  createdAt: string;
  notes: string | null;
  staffNotes: string | null;
  vaccine: { id: string; slug: string; name: string; route: string; siteOptions: string[]; doseMl: number | null; visVersion: string | null };
  customer: { id: string; fullName: string; phone: string | null } | null;
  screening: { outcome: string; outcomeReason: string | null } | null;
  record: { id: string; certificateCode: string; status: string } | null;
};

type RecordRow = {
  id: string;
  certificateCode: string;
  patientName: string;
  patientPhone: string | null;
  doseNumber: number;
  lotNumber: string;
  site: string | null;
  route: string;
  administeredAt: string;
  observationMinutes: number;
  observationOutcome: string;
  nextDueDate: string | null;
  status: string;
  vaccine: { name: string; slug: string };
  administeredBy: { email: string } | null;
  customer: { id: string; fullName: string } | null;
  aefiReports: { id: string; severity: string }[];
};

type AefiRow = {
  id: string;
  severity: string;
  symptoms: string;
  actionTaken: string;
  outcome: string;
  reportedToAuthority: boolean;
  onsetAt: string;
  immunization: { vaccine: { name: string }; patientName?: string };
};

type CounsellingRow = {
  id: string;
  topic: string;
  status: string;
  patientName: string;
  patientPhone: string | null;
  preferredDate: string | null;
  summary: string | null;
  createdAt: string;
};

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  theme: string;
  short: string;
  startDate: string;
  endDate: string | null;
  targetDoses: number | null;
  dosesAdministered: number;
  active: boolean;
};

type CredentialRow = {
  id: string;
  title: string;
  credentialType: string;
  issuedBy: string;
  expiresAt: string | null;
  user: { id: string; email: string; role: string };
};

type Policy = {
  enabled: boolean;
  jurisdiction: string;
  authorizingBody: string;
  authorizingRegulation: string | null;
  supervisingPharmacistRequired: boolean;
  observationMinutesDefault: number;
  visRequired: boolean;
  walkInAccepted: boolean;
  paediatricOnSite: boolean;
  publicDisclaimer: string | null;
  coldChainNotes: string | null;
  aefiReportingContact: string | null;
};

export function AdminVaccinationCenter({
  vaccines,
  appointments,
  records,
  aefi,
  counselling,
  campaigns,
  credentials,
  policy,
  customers,
  staff,
}: {
  vaccines: VaccineRow[];
  appointments: AppointmentRow[];
  records: RecordRow[];
  aefi: AefiRow[];
  counselling: CounsellingRow[];
  campaigns: CampaignRow[];
  credentials: CredentialRow[];
  policy: Policy;
  customers: { id: string; fullName: string; phone: string | null }[];
  staff: { id: string; email: string; role: string }[];
}) {
  const [tab, setTab] = useState<"queue" | "administer" | "records" | "aefi" | "counselling" | "campaigns" | "credentials" | "policy">("queue");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [adminState, adminAction, adminPending] = useActionState(administerVaccinationAction, {} as VaccinationActionState);
  const [apptState, apptAction, apptPending] = useActionState(updateAppointmentStatusAction, {} as VaccinationActionState);
  const [obsState, obsAction] = useActionState(completeObservationAction, {} as VaccinationActionState);
  const [aefiState, aefiAction, aefiPending] = useActionState(recordAefiAction, {} as VaccinationActionState);
  const [cState, cAction] = useActionState(completeCounsellingAction, {} as VaccinationActionState);
  const [credState, credAction] = useActionState(saveCredentialAction, {} as VaccinationActionState);
  const [polState, polAction] = useActionState(savePolicyAction, {} as VaccinationActionState);
  const [campState, campAction] = useActionState(createCampaignAction, {} as VaccinationActionState);

  useEffect(() => {
    for (const s of [adminState, apptState, obsState, aefiState, cState, credState, polState, campState]) {
      if (s?.success) toast.success(s.success);
      if (s?.error) toast.error(s.error);
    }
  }, [adminState, apptState, obsState, aefiState, cState, credState, polState, campState]);

  const filteredAppts = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q.trim()) return true;
      const hay = `${a.patientName} ${a.patientPhone} ${a.vaccine.name}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [appointments, q, statusFilter]);

  const [prefill, setPrefill] = useState<AppointmentRow | null>(null);

  const tabs = [
    ["queue", "Clinic queue", CalendarCheck],
    ["administer", "Administer", Syringe],
    ["records", "Records", ClipboardList],
    ["aefi", "AEFI", AlertTriangle],
    ["counselling", "Counselling", Stethoscope],
    ["campaigns", "Campaigns", Megaphone],
    ["credentials", "Credentials", Users],
    ["policy", "Policy", ShieldCheck],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === id ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)]" : "admin-chip"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "queue" && (
        <div className="admin-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 admin-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search patient or vaccine…"
                className="w-full rounded-xl border border-[var(--admin-border)] bg-transparent py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm"
            >
              {["all", "requested", "screened", "scheduled", "checked_in", "administered", "completed", "deferred", "referred", "cancelled"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider admin-muted">
                <tr>
                  <th className="pb-2">Patient</th>
                  <th className="pb-2">Vaccine</th>
                  <th className="pb-2">Screening</th>
                  <th className="pb-2">When</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAppts.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--admin-border)]">
                    <td className="py-3">
                      <p className="font-medium">{a.patientName}</p>
                      <p className="text-xs admin-muted">{a.patientPhone}</p>
                    </td>
                    <td className="py-3">{a.vaccine.name}</td>
                    <td className="py-3 text-xs">{a.screening?.outcome || "—"}</td>
                    <td className="py-3 text-xs">
                      {a.preferredDate || "walk-in / TBC"} {a.preferredTime || ""}
                    </td>
                    <td className="py-3">
                      <span className="badge">{a.status.replace(/_/g, " ")}</span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="text-xs font-semibold text-teal-800"
                          onClick={() => {
                            setPrefill(a);
                            setTab("administer");
                          }}
                        >
                          Administer
                        </button>
                        <form action={apptAction}>
                          <input type="hidden" name="appointmentId" value={a.id} />
                          <input type="hidden" name="status" value="checked_in" />
                          <button type="submit" disabled={apptPending} className="text-xs font-semibold">Check in</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAppts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm admin-muted">No appointments in this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "administer" && (
        <form action={adminAction} className="admin-card grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Record a dose</h3>
            {adminState?.certificateCode && (
              <span className="badge">Certificate {adminState.certificateCode}</span>
            )}
          </div>
          <input type="hidden" name="appointmentId" value={prefill?.id || ""} />
          <label className="text-sm sm:col-span-2">
            Patient type
            <select
              name="customerId"
              defaultValue={prefill?.customer?.id || "walkin"}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2"
            >
              <option value="walkin">Walk-in (no account)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName}{c.phone ? ` · ${c.phone}` : ""}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Patient name
            <input name="patientName" required defaultValue={prefill?.patientName || ""} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            Phone
            <input name="patientPhone" defaultValue={prefill?.patientPhone || ""} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            Date of birth
            <input type="date" name="patientDob" defaultValue={prefill?.patientDob?.slice(0, 10) || ""} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            Vaccine
            <select name="vaccineProductId" required defaultValue={prefill?.vaccine.id || vaccines.find((v) => v.pharmacyAdministered)?.id} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2">
              {vaccines.filter((v) => v.pharmacyAdministered).map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Dose number
            <input name="doseNumber" type="number" min={1} defaultValue={1} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            Route
            <select name="route" defaultValue={prefill?.vaccine.route || "IM"} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2">
              {["IM", "SC", "oral", "nasal", "ID"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Site
            <input name="site" required placeholder="Left deltoid" defaultValue={prefill?.vaccine.siteOptions?.[0] || "Left deltoid"} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            Volume (mL)
            <input name="doseMl" defaultValue={prefill?.vaccine.doseMl ?? 0.5} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            Lot / batch *
            <input name="lotNumber" required className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            Expiry
            <input type="date" name="expiryDate" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            Manufacturer
            <input name="manufacturer" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            VIS version
            <input name="visVersion" defaultValue={prefill?.vaccine.visVersion || ""} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            Observation (minutes)
            <input name="observationMinutes" defaultValue={policy.observationMinutesDefault} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <label className="text-sm">
            Supervising pharmacist
            <select name="supervisingPharmacistId" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2">
              <option value="">Self / not required</option>
              {staff.filter((s) => s.role === "pharmacist" || s.role === "manager").map((s) => (
                <option key={s.id} value={s.id}>{s.email}</option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Clinical notes
            <textarea name="notes" rows={2} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
          </label>
          <button type="submit" disabled={adminPending} className="btn-primary inline-flex justify-center text-sm sm:col-span-2">
            {adminPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Syringe className="h-4 w-4" />}
            {adminPending ? "Saving…" : "Save administration record"}
          </button>
          <p className="sm:col-span-2 text-[11px] admin-muted">
            Lot, site, route, VIS, immuniser, and observation are required for a complete legal record. Patient remains on site for the observation window.
          </p>
        </form>
      )}

      {tab === "records" && (
        <div className="admin-card overflow-x-auto p-5">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider admin-muted">
              <tr>
                <th className="pb-2">Certificate</th>
                <th className="pb-2">Patient</th>
                <th className="pb-2">Vaccine</th>
                <th className="pb-2">Lot / site</th>
                <th className="pb-2">When</th>
                <th className="pb-2">Observation</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-[var(--admin-border)]">
                  <td className="py-3 font-mono text-xs">{r.certificateCode}</td>
                  <td className="py-3">{r.patientName}</td>
                  <td className="py-3">{r.vaccine.name} <span className="admin-muted">d{r.doseNumber}</span></td>
                  <td className="py-3 text-xs">{r.lotNumber} · {r.site} · {r.route}</td>
                  <td className="py-3 text-xs">{new Date(r.administeredAt).toLocaleString()}</td>
                  <td className="py-3">
                    <form action={obsAction} className="flex items-center gap-2">
                      <input type="hidden" name="recordId" value={r.id} />
                      <select name="observationOutcome" defaultValue={r.observationOutcome} className="rounded-lg border border-[var(--admin-border)] bg-transparent px-2 py-1 text-xs">
                        <option value="uneventful">uneventful</option>
                        <option value="delayed">delayed</option>
                        <option value="aefi">aefi</option>
                      </select>
                      <button type="submit" className="text-xs font-semibold">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "aefi" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <form action={aefiAction} className="admin-card space-y-3 p-5">
            <h3 className="text-sm font-semibold">Log AEFI</h3>
            <label className="block text-sm">
              Immunisation
              <select name="immunizationId" required className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2">
                <option value="">Select record…</option>
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.certificateCode} · {r.patientName} · {r.vaccine.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Onset
              <input type="datetime-local" name="onsetAt" required className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
            </label>
            <label className="block text-sm">
              Severity
              <select name="severity" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2">
                <option value="mild">mild</option>
                <option value="moderate">moderate</option>
                <option value="severe">severe</option>
                <option value="life_threatening">life-threatening</option>
              </select>
            </label>
            <label className="block text-sm">
              Symptoms
              <textarea name="symptoms" required rows={3} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
            </label>
            <label className="block text-sm">
              Action taken
              <textarea name="actionTaken" required rows={2} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="reportedToAuthority" value="true" />
              Reported to PPB / surveillance
            </label>
            <button type="submit" disabled={aefiPending} className="btn-primary inline-flex text-sm">
              {aefiPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Save AEFI
            </button>
          </form>
          <div className="admin-card p-5">
            <h3 className="text-sm font-semibold">Recent reports</h3>
            <ul className="mt-3 space-y-3">
              {aefi.map((r) => (
                <li key={r.id} className="rounded-xl border border-[var(--admin-border)] p-3 text-sm">
                  <p className="font-semibold">{r.immunization.vaccine.name} · {r.severity}</p>
                  <p className="mt-1 text-xs admin-muted">{r.symptoms}</p>
                  <p className="mt-1 text-[11px]">{r.reportedToAuthority ? "Reported to authority" : "Internal record"} · {r.outcome}</p>
                </li>
              ))}
              {aefi.length === 0 && <p className="text-sm admin-muted">No AEFI reports.</p>}
            </ul>
          </div>
        </div>
      )}

      {tab === "counselling" && (
        <div className="admin-card overflow-x-auto p-5">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider admin-muted">
              <tr>
                <th className="pb-2">Patient</th>
                <th className="pb-2">Topic</th>
                <th className="pb-2">When</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Complete</th>
              </tr>
            </thead>
            <tbody>
              {counselling.map((s) => (
                <tr key={s.id} className="border-t border-[var(--admin-border)] align-top">
                  <td className="py-3">
                    <p className="font-medium">{s.patientName}</p>
                    <p className="text-xs admin-muted">{s.patientPhone}</p>
                  </td>
                  <td className="py-3 text-xs">{COUNSELLING_TOPICS.find((t) => t.slug === s.topic)?.title || s.topic}</td>
                  <td className="py-3 text-xs">{s.preferredDate || new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="py-3"><span className="badge">{s.status}</span></td>
                  <td className="py-3">
                    <form action={cAction} className="space-y-1">
                      <input type="hidden" name="sessionId" value={s.id} />
                      <input type="hidden" name="status" value="completed" />
                      <textarea name="summary" placeholder="Session summary" rows={2} defaultValue={s.summary || ""} className="w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-2 py-1 text-xs" />
                      <button type="submit" className="text-xs font-semibold">Mark complete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <form action={campAction} className="admin-card space-y-3 p-5">
            <h3 className="text-sm font-semibold">New public-health campaign</h3>
            <label className="block text-sm">Title<input name="title" required className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <label className="block text-sm">Slug<input name="slug" required placeholder="flu-season-2026" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <label className="block text-sm">Theme
              <select name="theme" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2">
                <option value="vaccination">vaccination</option>
                <option value="screening">screening</option>
                <option value="counselling">counselling</option>
                <option value="education">education</option>
                <option value="outbreak">outbreak</option>
              </select>
            </label>
            <label className="block text-sm">Short<input name="short" required className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <label className="block text-sm">Description<textarea name="description" rows={3} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">Start<input type="date" name="startDate" required className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
              <label className="text-sm">End<input type="date" name="endDate" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            </div>
            <label className="block text-sm">Target population<input name="targetPopulation" defaultValue="Adults 18+" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <label className="block text-sm">Vaccines offered (slugs, comma) <input name="vaccinesOffered" placeholder="influenza, covid-19" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <label className="block text-sm">Walk-in days<input name="walkInDays" placeholder="Mon–Sat 9am–4pm" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <label className="block text-sm">Target doses<input name="targetDoses" type="number" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <button type="submit" className="btn-primary inline-flex text-sm"><Plus className="h-4 w-4" /> Publish campaign</button>
          </form>
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="admin-card p-4">
                <p className="text-xs uppercase tracking-wider admin-muted">{c.theme}</p>
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 text-xs admin-muted">{c.short}</p>
                <p className="mt-2 text-xs">{c.dosesAdministered}{c.targetDoses ? ` / ${c.targetDoses}` : ""} doses</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "credentials" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <form action={credAction} className="admin-card space-y-3 p-5">
            <h3 className="text-sm font-semibold">Add immuniser credential</h3>
            <label className="block text-sm">Staff
              <select name="userId" required className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2">
                {staff.map((s) => <option key={s.id} value={s.id}>{s.email} ({s.role})</option>)}
              </select>
            </label>
            <label className="block text-sm">Type
              <select name="credentialType" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2">
                <option value="immunization_certificate">Immunisation certificate</option>
                <option value="anaphylaxis">Anaphylaxis / adrenaline</option>
                <option value="cpr_bls">CPR / BLS</option>
                <option value="ppb_licence">PPB practising licence</option>
              </select>
            </label>
            <label className="block text-sm">Title<input name="title" required className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <label className="block text-sm">Issuer<input name="issuedBy" required className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <label className="block text-sm">Licence / number<input name="licenseNumber" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">Issued<input type="date" name="issuedAt" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
              <label className="text-sm">Expires<input type="date" name="expiresAt" className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
            </div>
            <button type="submit" className="btn-primary inline-flex text-sm">Save credential</button>
          </form>
          <div className="admin-card p-5">
            <h3 className="text-sm font-semibold">On file</h3>
            <ul className="mt-3 space-y-2">
              {credentials.map((c) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                return (
                  <li key={c.id} className="rounded-xl border border-[var(--admin-border)] p-3 text-sm">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs admin-muted">{c.user.email} · {c.issuedBy}</p>
                    <p className={`mt-1 text-[11px] ${expired ? "text-rose-600" : ""}`}>
                      {c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleDateString()}` : "No expiry"}
                      {expired ? " — RENEW" : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {tab === "policy" && (
        <form action={polAction} className="admin-card grid gap-4 p-5 sm:grid-cols-2">
          <h3 className="text-sm font-semibold sm:col-span-2">Local immunisation policy</h3>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="enabled" value="true" defaultChecked={policy.enabled} /> Programme enabled at this pharmacy
          </label>
          <label className="text-sm">Jurisdiction<input name="jurisdiction" defaultValue={policy.jurisdiction} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
          <label className="text-sm">Authorising body<input name="authorizingBody" defaultValue={policy.authorizingBody} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
          <label className="text-sm sm:col-span-2">Regulation / circular<textarea name="authorizingRegulation" rows={2} defaultValue={policy.authorizingRegulation || ""} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="supervisingPharmacistRequired" value="true" defaultChecked={policy.supervisingPharmacistRequired} /> Supervising pharmacist required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="visRequired" value="true" defaultChecked={policy.visRequired} /> VIS / information sheet required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="walkInAccepted" value="true" defaultChecked={policy.walkInAccepted} /> Walk-ins accepted
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="paediatricOnSite" value="true" defaultChecked={policy.paediatricOnSite} /> Paediatric KEPI doses on site (rare)
          </label>
          <label className="text-sm">Default observation (min)<input name="observationMinutesDefault" type="number" defaultValue={policy.observationMinutesDefault} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
          <label className="text-sm">AEFI reporting contact<input name="aefiReportingContact" defaultValue={policy.aefiReportingContact || ""} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
          <label className="text-sm sm:col-span-2">Public disclaimer<textarea name="publicDisclaimer" rows={3} defaultValue={policy.publicDisclaimer || ""} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
          <label className="text-sm sm:col-span-2">Cold-chain notes<textarea name="coldChainNotes" rows={2} defaultValue={policy.coldChainNotes || ""} className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-transparent px-3 py-2" /></label>
          <button type="submit" className="btn-primary inline-flex text-sm sm:col-span-2">Save policy</button>
        </form>
      )}
    </div>
  );
}
