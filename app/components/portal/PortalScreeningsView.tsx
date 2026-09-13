"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Heart,
  Scale,
  Thermometer,
  FileText,
  CalendarCheck,
  Building2,
  AlertCircle,
  Printer,
  ShieldCheck,
  Sparkles,
  X,
  Copy,
  Check,
  Share2,
  Info,
} from "lucide-react";
import {
  classifyBloodPressure,
  classifyBloodGlucose,
  calculateAndClassifyBmi,
} from "@/app/lib/screening-utils";
import { useTenantBrand } from "@/app/components/TenantBrand";

interface ScreeningRecordItem {
  id: string;
  screeningType: string;
  patientName: string;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseRate?: number | null;
  bpCategory?: string | null;
  bloodGlucose?: number | string | null;
  glucoseUnit?: string | null;
  fastingStatus?: string | null;
  glucoseCategory?: string | null;
  weightKg?: number | string | null;
  heightCm?: number | string | null;
  bmi?: number | string | null;
  bmiCategory?: string | null;
  temperatureC?: number | string | null;
  tempCategory?: string | null;
  spO2Percent?: number | null;
  poctType?: string | null;
  poctResult?: string | null;
  poctValues?: any;
  notes?: string | null;
  equipmentUsed?: string | null;
  requiresReferral: boolean;
  referralUrgency?: string | null;
  createdAt: string | Date;
  conductedBy?: { id: string; email: string; role: string } | null;
  referrals?: any[];
}

interface ReferralItem {
  id: string;
  referenceCode: string;
  destinationType: string;
  facilityName: string;
  facilityContact?: string | null;
  specialistType?: string | null;
  urgency: string;
  reason: string;
  clinicalSummary: string;
  pharmacistRecommendations?: string | null;
  status: string;
  issuedAt: string | Date;
  patientName: string;
  patientPhone?: string | null;
  patientEmail?: string | null;
  patientGender?: string | null;
  referredBy?: { id: string; email: string; role: string } | null;
  screening?: any;
}

export function PortalScreeningsView({
  screenings,
  referrals,
  patientName,
}: {
  screenings: ScreeningRecordItem[];
  referrals: ReferralItem[];
  patientName: string;
}) {
  const brand = useTenantBrand();
  const issuingProviderName = brand.slug ? brand.name : "Issuing pharmacy";
  const [selectedReferral, setSelectedReferral] = useState<ReferralItem | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "referrals" | "calculator">("history");
  const [copiedCode, setCopiedCode] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const latestWithBp = screenings.find((s) => s.systolicBp && s.diastolicBp);
  const latestWithGlucose = screenings.find((s) => s.bloodGlucose != null);
  const latestWithBmi = screenings.find((s) => s.bmi != null);
  const latestWithTemp = screenings.find((s) => s.temperatureC != null);

  const [calcSys, setCalcSys] = useState("120");
  const [calcDia, setCalcDia] = useState("80");
  const [calcGlu, setCalcGlu] = useState("5.2");
  const [calcGluUnit, setCalcGluUnit] = useState("mmol/L");
  const [calcFast, setCalcFast] = useState("fasting");
  const [calcWeight, setCalcWeight] = useState("70");
  const [calcHeight, setCalcHeight] = useState("170");

  const calcBpRes = classifyBloodPressure(calcSys ? parseInt(calcSys, 10) : null, calcDia ? parseInt(calcDia, 10) : null);
  const calcGluRes = classifyBloodGlucose(calcGlu ? parseFloat(calcGlu) : null, calcGluUnit, calcFast);
  const calcBmiRes = calculateAndClassifyBmi(calcWeight ? parseFloat(calcWeight) : null, calcHeight ? parseFloat(calcHeight) : null);

  const handlePrint = () => window.print();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredScreenings = screenings.filter((s) => {
    if (filterType === "all") return true;
    if (filterType === "bp") return s.systolicBp != null;
    if (filterType === "glucose") return s.bloodGlucose != null;
    if (filterType === "bmi") return s.bmi != null;
    if (filterType === "referral") return s.requiresReferral;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-teal-900/10 bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/40 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-100/80 px-3 py-0.5 text-xs font-bold text-teal-950">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
              <span>Verified Health Record</span>
            </div>
            <h2 className="text-xl font-bold text-[#0c1a14] md:text-2xl">Health Screenings &amp; Vitals Tracker</h2>
            <p className="text-xs text-[#5a6b62] max-w-xl leading-relaxed">
              Track your blood pressure, capillary glucose, BMI, and vital records captured by participating pharmacies. View official pharmacist referrals when medical follow-up is recommended.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href="/services/health-screenings" className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold shadow-xs hover:scale-[1.02] transition">
              <CalendarCheck className="h-4 w-4" /> Book Next Check
            </Link>
            <Link href="/screenings" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition">
              <Info className="h-4 w-4 text-teal-700" /> Screening Guide
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-red-500" /> Blood Pressure</span>
            {latestWithBp && <span className="text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">{new Date(latestWithBp.createdAt).toLocaleDateString()}</span>}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[#0c1a14]">{latestWithBp ? `${latestWithBp.systolicBp}/${latestWithBp.diastolicBp}` : "—"}<span className="text-xs font-normal text-gray-500 ml-1">mmHg</span></p>
            <p className="text-xs font-semibold text-teal-800 mt-0.5 capitalize">{latestWithBp?.bpCategory?.replace(/_/g, " ") || "No reading recorded"}</p>
          </div>
          <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-100 flex items-center justify-between"><span>Optimal: &lt; 120/80 mmHg</span>{latestWithBp?.pulseRate && <span>Pulse: {latestWithBp.pulseRate} bpm</span>}</div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-teal-600" /> Blood Glucose</span>
            {latestWithGlucose && <span className="text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">{new Date(latestWithGlucose.createdAt).toLocaleDateString()}</span>}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[#0c1a14]">{latestWithGlucose ? `${latestWithGlucose.bloodGlucose}` : "—"}<span className="text-xs font-normal text-gray-500 ml-1">{latestWithGlucose?.glucoseUnit || "mmol/L"}</span></p>
            <p className="text-xs font-semibold text-teal-800 mt-0.5 capitalize">{latestWithGlucose?.fastingStatus ? `(${latestWithGlucose.fastingStatus}) ` : ""}{latestWithGlucose?.glucoseCategory?.replace(/_/g, " ") || "No reading recorded"}</p>
          </div>
          <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-100">Target Fasting: 3.9 – 5.5 mmol/L</div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><Scale className="h-3.5 w-3.5 text-indigo-500" /> BMI &amp; Weight</span>
            {latestWithBmi && <span className="text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">{new Date(latestWithBmi.createdAt).toLocaleDateString()}</span>}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[#0c1a14]">{latestWithBmi ? `${latestWithBmi.bmi}` : "—"}<span className="text-xs font-normal text-gray-500 ml-1">kg/m²</span></p>
            <p className="text-xs font-semibold text-teal-800 mt-0.5 capitalize">{latestWithBmi?.bmiCategory?.replace(/_/g, " ") || "No reading recorded"}{latestWithBmi?.weightKg ? ` (${latestWithBmi.weightKg} kg)` : ""}</p>
          </div>
          <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-100">Healthy Target: 18.5 – 24.9 kg/m²</div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5 text-emerald-500" /> Temperature</span>
            {latestWithTemp && <span className="text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">{new Date(latestWithTemp.createdAt).toLocaleDateString()}</span>}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[#0c1a14]">{latestWithTemp ? `${latestWithTemp.temperatureC}` : "—"}<span className="text-xs font-normal text-gray-500 ml-1">°C</span></p>
            <p className="text-xs font-semibold text-teal-800 mt-0.5 capitalize">{latestWithTemp?.tempCategory?.replace(/_/g, " ") || "No reading recorded"}</p>
          </div>
          <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-100">Normal: 36.1°C – 37.2°C</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button onClick={() => setActiveTab("history")} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === "history" ? "bg-teal-900 text-white shadow-xs" : "bg-white text-gray-600 hover:bg-gray-100"}`}><Activity className="h-3.5 w-3.5" /> Screening History ({screenings.length})</button>
        <button onClick={() => setActiveTab("referrals")} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === "referrals" ? "bg-teal-900 text-white shadow-xs" : "bg-white text-gray-600 hover:bg-gray-100"}`}><Building2 className="h-3.5 w-3.5" /> Clinical Referrals ({referrals.length})</button>
        <button onClick={() => setActiveTab("calculator")} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === "calculator" ? "bg-teal-900 text-white shadow-xs" : "bg-white text-gray-600 hover:bg-gray-100"}`}><Sparkles className="h-3.5 w-3.5 text-amber-400" /> Home Self-Check Monitor</button>
      </div>

      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
            <span className="text-xs font-bold text-gray-700">Filter History:</span>
            <div className="flex flex-wrap gap-1.5">
              {[["all", `All Checks (${screenings.length})`], ["bp", "Blood Pressure"], ["glucose", "Glucose"], ["bmi", "BMI & Weight"], ["referral", "Referral Flagged"]].map(([value, label]) => (
                <button key={value} onClick={() => setFilterType(value)} className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${filterType === value ? value === "referral" ? "bg-red-700 text-white font-bold" : "bg-teal-900 text-white font-bold" : "bg-gray-100 text-gray-600"}`}>{label}</button>
              ))}
            </div>
          </div>

          {filteredScreenings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <Activity className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="mt-2 font-bold text-sm text-[#0c1a14]">No health screenings recorded yet</p>
              <p className="text-xs text-gray-500 mt-1">Find a participating pharmacy offering blood pressure, glucose, or BMI screening.</p>
              <Link href="/services? q=health%20screening" className="btn-primary mt-4 inline-flex text-xs">Find a screening service</Link>
            </div>
          ) : (
            filteredScreenings.map((rec) => (
              <div key={rec.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs space-y-4 hover:border-teal-700/30 transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                  <div><span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 uppercase">{rec.screeningType.replace(/_/g, " ")}</span><span className="text-xs text-gray-500 ml-2">{new Date(rec.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
                  {rec.requiresReferral ? <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${rec.referralUrgency === "emergency" ? "bg-red-100 text-red-800" : rec.referralUrgency === "urgent" ? "bg-orange-100 text-orange-800" : "bg-amber-100 text-amber-800"}`}><AlertCircle className="h-3 w-3" /> Referral Recommended ({rec.referralUrgency || "Routine"})</span> : <span className="text-[11px] font-medium text-teal-800 bg-teal-50/80 px-2.5 py-0.5 rounded-full">✓ Normal Clinical Range</span>}
                </div>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 text-xs">
                  {rec.systolicBp && rec.diastolicBp && <div className="rounded-xl bg-gray-50 p-3"><span className="text-gray-500 font-semibold block">Blood Pressure</span><span className="text-sm font-bold text-[#0c1a14]">{rec.systolicBp}/{rec.diastolicBp} mmHg</span><span className="block text-[11px] text-teal-800 capitalize">{rec.bpCategory?.replace(/_/g, " ")}</span></div>}
                  {rec.bloodGlucose != null && <div className="rounded-xl bg-gray-50 p-3"><span className="text-gray-500 font-semibold block">Blood Glucose</span><span className="text-sm font-bold text-[#0c1a14]">{rec.bloodGlucose} {rec.glucoseUnit || "mmol/L"}</span><span className="block text-[11px] text-teal-800 capitalize">{rec.fastingStatus} • {rec.glucoseCategory?.replace(/_/g, " ")}</span></div>}
                  {rec.bmi != null && <div className="rounded-xl bg-gray-50 p-3"><span className="text-gray-500 font-semibold block">BMI &amp; Weight</span><span className="text-sm font-bold text-[#0c1a14]">{rec.bmi} kg/m² ({rec.weightKg} kg)</span><span className="block text-[11px] text-teal-800 capitalize">{rec.bmiCategory?.replace(/_/g, " ")}</span></div>}
                  {rec.temperatureC != null && <div className="rounded-xl bg-gray-50 p-3"><span className="text-gray-500 font-semibold block">Temperature</span><span className="text-sm font-bold text-[#0c1a14]">{rec.temperatureC} °C</span><span className="block text-[11px] text-teal-800 capitalize">{rec.tempCategory?.replace(/_/g, " ")}</span></div>}
                  {rec.poctType && <div className="rounded-xl bg-teal-50/50 p-3 col-span-2 sm:col-span-4"><span className="text-teal-900 font-semibold block">Point of Care Test ({rec.poctType.replace(/_/g, " ").toUpperCase()})</span><span className="text-sm font-bold text-[#0c1a14]">Result: {rec.poctResult || "Recorded"}</span></div>}
                </div>
                {rec.notes && <div className="rounded-xl bg-teal-50/40 p-3.5 text-xs text-[#0c1a14] border border-teal-900/5"><span className="font-bold text-teal-950 block">Pharmacist Notes &amp; Lifestyle Advice:</span><p className="mt-1 leading-relaxed text-[#5a6b62]">{rec.notes}</p></div>}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-50"><span>Equipment: {rec.equipmentUsed || "Calibrated clinical devices"}</span><span className="italic">* Screening is a preliminary evaluation, not a medical diagnosis.</span></div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "referrals" && (
        <div className="space-y-4">
          {referrals.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center"><Building2 className="h-8 w-8 text-gray-400 mx-auto" /><p className="mt-2 font-bold text-sm text-[#0c1a14]">No clinical referrals issued</p><p className="text-xs text-gray-500 mt-1">When screening parameters require further physician or laboratory evaluation, official referral slips will appear here.</p></div>
          ) : referrals.map((ref) => (
            <div key={ref.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xs space-y-4 hover:border-teal-700/30 transition">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-2.5 py-1 rounded-md">{ref.referenceCode}</span><span className="text-xs text-gray-500">Issued: {new Date(ref.issuedAt).toLocaleDateString()}</span></div>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${ref.urgency === "emergency" ? "bg-red-100 text-red-800" : ref.urgency === "urgent" ? "bg-orange-100 text-orange-800" : "bg-teal-100 text-teal-800"}`}>{ref.urgency.toUpperCase()}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-xs"><div><span className="text-gray-500 font-semibold">Referred Facility:</span><p className="text-sm font-bold text-[#0c1a14]">{ref.facilityName} {ref.specialistType ? `(${ref.specialistType})` : ""}</p><p className="text-gray-600 capitalize mt-0.5">Type: {ref.destinationType}</p></div><div><span className="text-gray-500 font-semibold">Reason for Referral:</span><p className="text-xs text-[#0c1a14] font-medium leading-relaxed mt-0.5">{ref.reason}</p></div></div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-50"><span className="text-[11px] text-gray-500">Status: <span className="font-semibold text-teal-900 capitalize">{ref.status}</span></span><button onClick={() => setSelectedReferral(ref)} className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-900 hover:text-teal-700 bg-teal-50 px-3.5 py-1.5 rounded-xl hover:bg-teal-100 transition"><FileText className="h-3.5 w-3.5" /> View Official Referral Slip →</button></div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "calculator" && (
        <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div><h3 className="text-base font-bold text-[#0c1a14]">Home Self-Check &amp; BMI Monitor</h3><p className="text-xs text-gray-500 mt-1">Enter your self-measured values at home to evaluate your baseline trends before your next pharmacy visit.</p></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-gray-700">Blood Pressure (Systolic / Diastolic)</label><div className="grid grid-cols-2 gap-2 mt-1"><input type="number" value={calcSys} onChange={(e) => setCalcSys(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs" placeholder="Systolic" /><input type="number" value={calcDia} onChange={(e) => setCalcDia(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs" placeholder="Diastolic" /></div></div>
              <div><label className="text-xs font-bold text-gray-700">Blood Glucose</label><div className="grid grid-cols-3 gap-2 mt-1"><input type="number" step="0.1" value={calcGlu} onChange={(e) => setCalcGlu(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs" /><select value={calcGluUnit} onChange={(e) => setCalcGluUnit(e.target.value)} className="rounded-xl border border-gray-200 px-2 py-2 text-xs"><option value="mmol/L">mmol/L</option><option value="mg/dL">mg/dL</option></select><select value={calcFast} onChange={(e) => setCalcFast(e.target.value)} className="rounded-xl border border-gray-200 px-2 py-2 text-xs"><option value="fasting">Fasting</option><option value="random">Random</option></select></div></div>
              <div><label className="text-xs font-bold text-gray-700">Weight (kg) &amp; Height (cm)</label><div className="grid grid-cols-2 gap-2 mt-1"><input type="number" step="0.5" value={calcWeight} onChange={(e) => setCalcWeight(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs" placeholder="Weight kg" /><input type="number" value={calcHeight} onChange={(e) => setCalcHeight(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs" placeholder="Height cm" /></div></div>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl bg-teal-50/60 p-4 border border-teal-100 text-xs space-y-1"><span className="font-bold text-teal-950">Estimated BP Status:</span><p className="font-bold text-sm text-[#0c1a14]">{calcBpRes.label}</p><p className="text-gray-600">{calcBpRes.guidance}</p></div>
              <div className="rounded-2xl bg-teal-50/60 p-4 border border-teal-100 text-xs space-y-1"><span className="font-bold text-teal-950">Estimated Glucose Status:</span><p className="font-bold text-sm text-[#0c1a14]">{calcGluRes.label}</p><p className="text-gray-600">{calcGluRes.guidance}</p></div>
              <div className="rounded-2xl bg-teal-50/60 p-4 border border-teal-100 text-xs space-y-1"><span className="font-bold text-teal-950">Estimated BMI:</span><p className="font-bold text-sm text-[#0c1a14]">{calcBmiRes.bmi ? `${calcBmiRes.bmi} kg/m² (${calcBmiRes.label})` : "Enter height and weight"}</p><p className="text-gray-600">{calcBmiRes.guidance}</p></div>
            </div>
          </div>
        </div>
      )}

      {selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 print:shadow-none print:p-0 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-teal-800" /><span className="font-bold text-sm text-[#0c1a14]">Pharmacist Clinical Referral Slip</span></div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleCopyCode(selectedReferral.referenceCode)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition" title="Copy Reference Code">{copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}<span>{copiedCode ? "Copied!" : "Copy Code"}</span></button>
                <a href={`https://wa.me/?text=${encodeURIComponent(`${issuingProviderName} Clinical Referral Slip (${selectedReferral.referenceCode})\nPatient: ${selectedReferral.patientName}\nReferred to: ${selectedReferral.facilityName} (${selectedReferral.destinationType})\nUrgency: ${selectedReferral.urgency.toUpperCase()}\nReason: ${selectedReferral.reason}`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition"><Share2 className="h-3.5 w-3.5" /> WhatsApp</a>
                <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-teal-900 bg-teal-50 rounded-xl hover:bg-teal-100 transition"><Printer className="h-3.5 w-3.5" /> Print Slip</button>
                <button onClick={() => setSelectedReferral(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="border border-gray-300 rounded-2xl p-6 sm:p-8 space-y-5 bg-white text-[#0c1a14]">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-extrabold text-xl text-teal-950">{issuingProviderName}</h3>
                  <p className="text-xs text-gray-500">Provider contact and licence details are shown only when published by the issuing pharmacy.</p>
                </div>
                <div className="text-right"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Referral Ref</span><span className="font-mono font-bold text-sm text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md inline-block">{selectedReferral.referenceCode}</span><span className="text-[10px] text-gray-500 block mt-1">Date: {new Date(selectedReferral.issuedAt).toLocaleDateString()}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl text-xs"><div><span className="text-gray-500 font-semibold">Patient Name: </span><span className="font-bold text-[#0c1a14]">{selectedReferral.patientName}</span></div><div><span className="text-gray-500 font-semibold">Contact: </span><span>{selectedReferral.patientPhone || "N/A"}</span></div><div><span className="text-gray-500 font-semibold">Referral Urgency: </span><span className="font-bold uppercase text-red-700">{selectedReferral.urgency}</span></div><div><span className="text-gray-500 font-semibold">Destination: </span><span className="font-bold capitalize">{selectedReferral.destinationType}</span></div></div>
              <div className="space-y-1 text-xs"><span className="font-bold text-gray-700">Referred Facility / Specialty:</span><p className="text-sm font-bold text-teal-950">{selectedReferral.facilityName} {selectedReferral.specialistType ? `(${selectedReferral.specialistType})` : ""}</p>{selectedReferral.facilityContact && <p className="text-gray-500">Contact: {selectedReferral.facilityContact}</p>}</div>
              <div className="space-y-1 text-xs"><span className="font-bold text-gray-700">Reason for Referral:</span><p className="text-xs leading-relaxed text-[#0c1a14] bg-amber-50/60 p-3 rounded-lg border border-amber-100 font-medium">{selectedReferral.reason}</p></div>
              <div className="space-y-1 text-xs"><span className="font-bold text-gray-700">Clinical Screening Summary &amp; Findings:</span><p className="text-xs leading-relaxed text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded-lg">{selectedReferral.clinicalSummary}</p></div>
              {selectedReferral.pharmacistRecommendations && <div className="space-y-1 text-xs"><span className="font-bold text-gray-700">Pharmacist Initial Recommendations:</span><p className="text-xs leading-relaxed text-gray-700 bg-teal-50/40 p-3 rounded-lg border border-teal-900/5">{selectedReferral.pharmacistRecommendations}</p></div>}
              <div className="text-[10px] text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">* Note for receiving clinician: This referral is issued following a community pharmacy screening. Health screening is a preliminary risk identification tool and does not constitute a definitive medical diagnosis.</div>
              <div className="pt-4 border-t flex items-end justify-between text-xs"><div><p className="font-semibold text-gray-700">Referring Pharmacist:</p><p className="text-xs text-gray-500">Licensed Pharmacist on Duty</p><p className="text-[10px] text-gray-400">{issuingProviderName} Clinical Services</p></div><div className="text-right"><div className="w-36 border-b border-gray-400 mb-1"></div><p className="text-[10px] text-gray-500">Pharmacist Signature &amp; Official Stamp</p></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
