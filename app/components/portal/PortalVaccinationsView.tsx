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
    <div className="min-w-0 space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href="/vaccinations/book" className="min-h-11 min-w-11 btn-primary inline-flex text-sm">
          <Syringe className="h-4 w-4" /> Book a vaccine
        </Link>
        <Link href="/preventive" className="min-h-11 min-w-11 inline-flex items-center gap-2 rounded-full border border-teal-900/15 bg-white px-4 py-2 text-sm font-semibold text-[#084c3f]">
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
          <>
            <div className="mt-3 space-y-3 sm:hidden">
              {records.map((r) => (
                <article key={r.id} className="rounded-2xl border border-[#e3ebe6] bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-base font-semibold text-[#0c1a14]">{r.vaccine.name}</p>
                      <p className="mt-1 text-sm text-[#5a6b62]">Dose {r.doseNumber}{r.seriesComplete ? " · complete" : ""}</p>
                    </div>
                    <Syringe className="h-5 w-5 shrink-0 text-teal-800" aria-hidden="true" />
                  </div>
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#5a6b62]">
                    <div><dt className="font-semibold text-[#0c1a14]">Date</dt><dd>{new Date(r.administeredAt).toLocaleDateString()}</dd></div>
                    <div><dt className="font-semibold text-[#0c1a14]">Next due</dt><dd>{r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : "—"}</dd></div>
                    <div><dt className="font-semibold text-[#0c1a14]">Certificate</dt><dd><button type="button" className="min-h-11 min-w-11 mt-1 inline-flex w-full items-center justify-center rounded-xl border border-teal-900/15 px-3 py-2 text-sm font-semibold text-teal-800" onClick={() => setOpen(r)}>{r.certificateCode}</button></dd></div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="mt-3 hidden rounded-2xl border border-white/60 bg-white shadow-sm sm:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="text-sm uppercase tracking-wider text-[#5a6b62]"><tr><th className="px-4 py-3">Vaccine</th><th className="px-4 py-3">Dose</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Next due</th><th className="px-4 py-3">Certificate</th></tr></thead>
                <tbody>{records.map((r) => (<tr key={r.id} className="border-t border-[#e3ebe6] align-top"><td className="break-words px-4 py-3 font-medium">{r.vaccine.name}</td><td className="break-words px-4 py-3">{r.doseNumber}{r.seriesComplete ? " · complete" : ""}</td><td className="break-words px-4 py-3">{new Date(r.administeredAt).toLocaleDateString()}</td><td className="break-words px-4 py-3">{r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : "—"}</td><td className="break-words px-4 py-3"><button type="button" className="min-h-11 min-w-11 inline-flex items-center text-sm font-semibold text-teal-800" onClick={() => setOpen(r)}>{r.certificateCode}</button></td></tr>))}</tbody>
              </table>
            </div>
          </>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-[#0c1a14]">Upcoming / requested</h2>
          <ul className="mt-3 space-y-2">
            {appointments.length === 0 && (
              <li className="rounded-2xl border border-[#e3ebe6] bg-white p-4 text-sm text-[#5a6b62]">No open bookings.</li>
            )}
            {appointments.map((a) => (
              <li key={a.id} className="rounded-2xl border border-white/60 bg-white p-4 shadow-sm">
                <p className="font-medium text-[#0c1a14]">{a.vaccine.name}</p>
                <p className="mt-1 text-sm text-[#5a6b62]">
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
                <p className="mt-1 text-sm text-[#5a6b62]">{c.status} · {new Date(c.createdAt).toLocaleDateString()}</p>
                {c.summary && <p className="mt-2 text-sm text-[#5a6b62]">{c.summary}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
            id="immunization-certificate"
          >
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">Immunisation certificate</p>
            <h3 className="mt-2 text-2xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
              Pharmacy immunisation record
            </h3>
            <p className="mt-1 text-sm text-[#5a6b62]">
              Provider identity must come from the issuing pharmacy record; this patient view does not substitute a template pharmacy name.
            </p>
            <p className="mt-4 text-sm text-[#5a6b62]">This certifies that</p>
            <p className="text-xl font-semibold text-[#0c1a14]">{open.patientName}</p>
            <p className="mt-4 text-sm">
              received <strong>{open.vaccine.name}</strong> ({open.vaccine.antigen}), dose {open.doseNumber},
              on {new Date(open.administeredAt).toLocaleString()}.
            </p>
            <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-[#5a6b62] sm:grid-cols-2">
              <div><dt className="uppercase tracking-wider">Certificate</dt><dd className="font-mono text-[#0c1a14]">{open.certificateCode}</dd></div>
              <div><dt className="uppercase tracking-wider">Lot</dt><dd className="text-[#0c1a14]">{open.lotNumber}</dd></div>
              <div><dt className="uppercase tracking-wider">Route / site</dt><dd className="text-[#0c1a14]">{open.route} · {open.site}</dd></div>
              <div><dt className="uppercase tracking-wider">Next due</dt><dd className="text-[#0c1a14]">{open.nextDueDate ? new Date(open.nextDueDate).toLocaleDateString() : "—"}</dd></div>
            </dl>
            <p className="mt-6 text-sm leading-relaxed text-[#5a6b62]">
              Issued under local pharmacy immunisation rules. Not a substitute for a national immunisation information system or an International Certificate of Vaccination where one is legally required (e.g. yellow fever ICVP).
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button type="button" className="min-h-11 min-w-11 btn-primary inline-flex text-sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </button>
              <button type="button" className="min-h-11 min-w-11 rounded-full px-4 py-2 text-sm font-semibold" onClick={() => setOpen(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
