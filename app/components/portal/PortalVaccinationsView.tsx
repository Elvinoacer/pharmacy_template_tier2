"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Printer,
  Syringe,
  HeartPulse,
} from "lucide-react";
import { COUNSELLING_TOPICS } from "@/app/lib/vaccination-catalog";

type RecordItem = {
  id: string;
  certificateCode: string;
  patientName: string;
  doseNumber: number;
  seriesComplete: boolean;
  administeredAt: string;
  lotNumber: string;
  site: string | null;
  route: string;
  nextDueDate: string | null;
  observationOutcome: string;
  vaccine: { name: string; antigen: string; slug: string };
};

type ApptItem = {
  id: string;
  status: string;
  preferredDate: string | null;
  preferredTime: string | null;
  createdAt: string;
  vaccine: { name: string; slug: string };
  screening: { outcome: string } | null;
};

type CounsellingItem = {
  id: string;
  topic: string;
  status: string;
  preferredDate: string | null;
  summary: string | null;
  createdAt: string;
};

export function PortalVaccinationsView({
  records,
  appointments,
  counselling,
}: {
  records: RecordItem[];
  appointments: ApptItem[];
  counselling: CounsellingItem[];
}) {
  const [open, setOpen] = useState<RecordItem | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <Link href="/vaccinations/book" className="btn-primary inline-flex text-sm">
          <Syringe className="h-4 w-4" /> Book a vaccine
        </Link>
        <Link href="/preventive" className="inline-flex items-center gap-2 rounded-full border border-teal-900/15 bg-white px-4 py-2 text-sm font-semibold text-[#084c3f]">
          <HeartPulse className="h-4 w-4" /> Preventive counselling
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-[#0c1a14]">Immunisation record</h2>
        {records.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-[#e3ebe6] bg-white p-6 text-sm text-[#5a6b62]">
            No doses on file yet. After a pharmacy vaccination, your certificate appears here.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/60 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-[#5a6b62]">
                <tr>
                  <th className="px-4 py-3">Vaccine</th>
                  <th className="px-4 py-3">Dose</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Next due</th>
                  <th className="px-4 py-3">Certificate</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t border-[#e3ebe6]">
                    <td className="px-4 py-3 font-medium">{r.vaccine.name}</td>
                    <td className="px-4 py-3">{r.doseNumber}{r.seriesComplete ? " · complete" : ""}</td>
                    <td className="px-4 py-3 text-xs">{new Date(r.administeredAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs">{r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <button type="button" className="text-xs font-semibold text-teal-800" onClick={() => setOpen(r)}>
                        {r.certificateCode}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-[#0c1a14]">Upcoming / requested</h2>
          <ul className="mt-3 space-y-2">
            {appointments.length === 0 && (
              <li className="rounded-2xl border border-[#e3ebe6] bg-white p-4 text-sm text-[#5a6b62]">No open bookings.</li>
            )}
            {appointments.map((a) => (
              <li key={a.id} className="rounded-2xl border border-white/60 bg-white p-4 shadow-sm">
                <p className="font-medium text-[#0c1a14]">{a.vaccine.name}</p>
                <p className="mt-1 text-xs text-[#5a6b62]">
                  {a.status.replace(/_/g, " ")} · {a.preferredDate || "date TBC"} {a.preferredTime || ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#0c1a14]">Preventive counselling</h2>
          <ul className="mt-3 space-y-2">
            {counselling.length === 0 && (
              <li className="rounded-2xl border border-[#e3ebe6] bg-white p-4 text-sm text-[#5a6b62]">No sessions yet.</li>
            )}
            {counselling.map((c) => (
              <li key={c.id} className="rounded-2xl border border-white/60 bg-white p-4 shadow-sm">
                <p className="font-medium text-[#0c1a14]">
                  {COUNSELLING_TOPICS.find((t) => t.slug === c.topic)?.title || c.topic}
                </p>
                <p className="mt-1 text-xs text-[#5a6b62]">{c.status} · {new Date(c.createdAt).toLocaleDateString()}</p>
                {c.summary && <p className="mt-2 text-xs text-[#5a6b62]">{c.summary}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            id="immunization-certificate"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">Immunisation certificate</p>
            <h3 className="mt-2 text-2xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
              Pharmacy immunisation record
            </h3>
            <p className="mt-1 text-xs text-[#5a6b62]">
              Provider identity must come from the issuing pharmacy record; this patient view does not substitute a template pharmacy name.
            </p>
            <p className="mt-4 text-sm text-[#5a6b62]">This certifies that</p>
            <p className="text-xl font-semibold text-[#0c1a14]">{open.patientName}</p>
            <p className="mt-4 text-sm">
              received <strong>{open.vaccine.name}</strong> ({open.vaccine.antigen}), dose {open.doseNumber},
              on {new Date(open.administeredAt).toLocaleString()}.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#5a6b62]">
              <div><dt className="uppercase tracking-wider">Certificate</dt><dd className="font-mono text-[#0c1a14]">{open.certificateCode}</dd></div>
              <div><dt className="uppercase tracking-wider">Lot</dt><dd className="text-[#0c1a14]">{open.lotNumber}</dd></div>
              <div><dt className="uppercase tracking-wider">Route / site</dt><dd className="text-[#0c1a14]">{open.route} · {open.site}</dd></div>
              <div><dt className="uppercase tracking-wider">Next due</dt><dd className="text-[#0c1a14]">{open.nextDueDate ? new Date(open.nextDueDate).toLocaleDateString() : "—"}</dd></div>
            </dl>
            <p className="mt-6 text-[11px] leading-relaxed text-[#5a6b62]">
              Issued under local pharmacy immunisation rules. Not a substitute for a national immunisation information system or an International Certificate of Vaccination where one is legally required (e.g. yellow fever ICVP).
            </p>
            <div className="mt-6 flex gap-2">
              <button type="button" className="btn-primary inline-flex text-sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </button>
              <button type="button" className="rounded-full px-4 py-2 text-sm font-semibold" onClick={() => setOpen(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
