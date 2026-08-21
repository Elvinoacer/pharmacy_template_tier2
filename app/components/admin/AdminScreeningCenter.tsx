"use client";

import { useState, useTransition } from "react";
import {
  Activity,
  Heart,
  Scale,
  Thermometer,
  FileText,
  Plus,
  Search,
  Filter,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Ambulance,
  PhoneCall,
  User,
  X,
  Stethoscope,
  Microscope,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  recordScreeningAction,
  issueReferralAction,
  updateReferralStatusAction,
  type ScreeningActionState,
} from "@/app/actions/screening";
import {
  classifyBloodPressure,
  classifyBloodGlucose,
  calculateAndClassifyBmi,
  classifyTemperature,
  KENYAN_REFERRAL_DESTINATIONS,
  AUTHORIZED_KENYAN_POCT_SERVICES,
} from "@/app/lib/screening-utils";
import { pharmacy } from "@/app/lib/data";

interface AdminScreeningRow {
  id: string;
  screeningType: string;
  patientName: string;
  patientPhone?: string | null;
  patientEmail?: string | null;
  patientAge?: number | null;
  patientGender?: string | null;
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
  notes?: string | null;
  equipmentUsed?: string | null;
  requiresReferral: boolean;
  referralUrgency?: string | null;
  createdAt: string;
  customer?: { id: string; fullName: string; phone?: string | null } | null;
  conductedBy?: { id: string; email: string } | null;
  referrals?: any[];
}

interface AdminReferralRow {
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
  issuedAt: string;
  patientName: string;
  patientPhone?: string | null;
  patientEmail?: string | null;
  patientGender?: string | null;
  customer?: { id: string; fullName: string; phone?: string | null } | null;
  referredBy?: { id: string; email: string } | null;
  screening?: any;
}

export function AdminScreeningCenter({
  screenings,
  referrals,
  customers,
}: {
  screenings: AdminScreeningRow[];
  referrals: AdminReferralRow[];
  customers: { id: string; fullName: string; phone?: string | null }[];
}) {
  const [activeTab, setActiveTab] = useState<"screenings" | "referrals" | "emergency">("screenings");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [referralFilter, setReferralFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<AdminReferralRow | null>(null);
  const [selectedScreening, setSelectedScreening] = useState<AdminScreeningRow | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Form State for Record Screening
  const [recPatientType, setRecPatientType] = useState<"customer" | "walkin">("walkin");
  const [recCustomerId, setRecCustomerId] = useState("");
  const [recName, setRecName] = useState("");
  const [recPhone, setRecPhone] = useState("");
  const [recEmail, setRecEmail] = useState("");
  const [recAge, setRecAge] = useState("");
  const [recGender, setRecGender] = useState("prefer_not_to_say");
  const [recType, setRecType] = useState("wellness_check");

  // Vitals
  const [recSys, setRecSys] = useState("");
  const [recDia, setRecDia] = useState("");
  const [recPulse, setRecPulse] = useState("");
  const [recGlu, setRecGlu] = useState("");
  const [recGluUnit, setRecGluUnit] = useState("mmol/L");
  const [recFast, setRecFast] = useState("random");
  const [recWeight, setRecWeight] = useState("");
  const [recHeight, setRecHeight] = useState("");
  const [recTemp, setRecTemp] = useState("");
  const [recSpO2, setRecSpO2] = useState("");
  const [recPoctType, setRecPoctType] = useState("");
  const [recPoctResult, setRecPoctResult] = useState("");
  const [recNotes, setRecNotes] = useState("");
  const [recEquipment, setRecEquipment] = useState("PPB-compliant calibrated clinical devices");
  const [recIssueRef, setRecIssueRef] = useState(false);
  const [recRefDest, setRecRefDest] = useState("clinic");
  const [recRefFacility, setRecRefFacility] = useState("Kenyatta National Hospital");
  const [recRefUrgency, setRecRefUrgency] = useState("routine");
  const [recRefReason, setRecRefReason] = useState("");
  const [recRefSummary, setRecRefSummary] = useState("");

  // Standalone Referral Modal State
  const [refPatientName, setRefPatientName] = useState("");
  const [refPatientPhone, setRefPatientPhone] = useState("");
  const [refDestinationType, setRefDestinationType] = useState("clinic");
  const [refFacilityName, setRefFacilityName] = useState("");
  const [refFacilityContact, setRefFacilityContact] = useState("");
  const [refSpecialistType, setRefSpecialistType] = useState("");
  const [refUrgency, setRefUrgency] = useState("routine");
  const [refReason, setRefReason] = useState("");
  const [refSummary, setRefSummary] = useState("");
  const [refRecommendations, setRefRecommendations] = useState("");
  const [refScreeningId, setRefScreeningId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<ScreeningActionState | null>(null);

  // Live classifications
  const liveBp = classifyBloodPressure(recSys ? parseInt(recSys, 10) : null, recDia ? parseInt(recDia, 10) : null);
  const liveGlu = classifyBloodGlucose(recGlu ? parseFloat(recGlu) : null, recGluUnit, recFast);
  const liveBmi = calculateAndClassifyBmi(recWeight ? parseFloat(recWeight) : null, recHeight ? parseFloat(recHeight) : null);
  const liveTemp = classifyTemperature(recTemp ? parseFloat(recTemp) : null);

  const handleCustomerSelect = (id: string) => {
    setRecCustomerId(id);
    const c = customers.find((cust) => cust.id === id);
    if (c) {
      setRecName(c.fullName);
      setRecPhone(c.phone || "");
    }
  };

  // Quick Preset Handlers for Pharmacists
  const applyAdminPreset = (mode: "bp" | "glucose" | "wellness" | "malaria") => {
    if (mode === "bp") {
      setRecType("blood_pressure");
      setRecSys("120");
      setRecDia("80");
      setRecPulse("72");
      setRecNotes("Routine BP check. Readings within optimal range.");
    } else if (mode === "glucose") {
      setRecType("blood_glucose");
      setRecGlu("5.4");
      setRecGluUnit("mmol/L");
      setRecFast("fasting");
      setRecNotes("Fasting capillary blood glucose within normal glycemic targets.");
    } else if (mode === "wellness") {
      setRecType("wellness_check");
      setRecSys("122");
      setRecDia("78");
      setRecPulse("74");
      setRecGlu("5.6");
      setRecFast("fasting");
      setRecWeight("68");
      setRecHeight("170");
      setRecTemp("36.6");
      setRecSpO2("98");
      setRecNotes("Comprehensive baseline wellness check. All vital signs stable.");
    } else if (mode === "malaria") {
      setRecType("point_of_care_test");
      setRecPoctType("malaria_rdt");
      setRecPoctResult("Negative");
      setRecTemp("37.8");
      setRecNotes("Febrile patient screened for malaria. RDT non-reactive. Advised on hydration and follow-up.");
    }
  };

  // 1-Click Referral Launcher from a Screening Row
  const handleLaunchReferralFromScreening = (s: AdminScreeningRow) => {
    setRefScreeningId(s.id);
    setRefPatientName(s.patientName);
    setRefPatientPhone(s.patientPhone || "");
    setRefUrgency(s.referralUrgency || (s.bpCategory === "hypertensive_crisis" ? "emergency" : "urgent"));
    setRefDestinationType(s.referralUrgency === "emergency" ? "emergency_services" : "hospital");
    setRefReason(
      s.bpCategory === "stage_2_hypertension" || s.bpCategory === "hypertensive_crisis"
        ? `Elevated Blood Pressure (${s.systolicBp}/${s.diastolicBp} mmHg) requiring physician workup.`
        : s.glucoseCategory === "diabetes_range"
        ? `Capillary Glucose ${s.bloodGlucose} ${s.glucoseUnit} in diabetes screening range.`
        : "Clinical screening parameter out of range."
    );
    setRefSummary(
      `Screening Findings (${new Date(s.createdAt).toLocaleDateString()}):\n` +
      `- Blood Pressure: ${s.systolicBp ? `${s.systolicBp}/${s.diastolicBp} mmHg (${s.bpCategory})` : "N/A"}\n` +
      `- Blood Glucose: ${s.bloodGlucose ? `${s.bloodGlucose} ${s.glucoseUnit} (${s.fastingStatus})` : "N/A"}\n` +
      `- BMI / Weight: ${s.bmi ? `${s.bmi} kg/m² (${s.weightKg} kg)` : "N/A"}\n` +
      `- Temperature: ${s.temperatureC ? `${s.temperatureC} °C` : "N/A"}\n` +
      (s.notes ? `- Pharmacist Notes: ${s.notes}` : "")
    );
    setRefRecommendations("Formal diagnostic evaluation, laboratory confirmation panel, and clinician consultation.");
    setShowReferralModal(true);
  };

  // Auto-fill Facility Contact from Kenyan Directory
  const handleFacilitySelect = (facilityName: string) => {
    setRefFacilityName(facilityName);
    const foundHospital = KENYAN_REFERRAL_DESTINATIONS.hospitals.find((h) => h.name === facilityName);
    if (foundHospital) {
      setRefFacilityContact(foundHospital.contact);
      return;
    }
    const foundLab = KENYAN_REFERRAL_DESTINATIONS.laboratories.find((l) => l.name === facilityName);
    if (foundLab) {
      setRefFacilityContact(foundLab.contact);
      return;
    }
    const foundClinic = KENYAN_REFERRAL_DESTINATIONS.clinics.find((c) => c.name === facilityName);
    if (foundClinic) {
      setRefFacilityContact(foundClinic.contact);
      return;
    }
  };

  // Export Screenings to CSV
  const handleExportCSV = () => {
    const headers = "ID,Date,Patient Name,Phone,Screening Type,Systolic BP,Diastolic BP,Glucose,BMI,Temp,POCT Type,POCT Result,Referral Urgency\n";
    const rows = screenings
      .map((s) =>
        `"${s.id}","${new Date(s.createdAt).toISOString()}","${s.patientName}","${s.patientPhone || ""}","${s.screeningType}","${s.systolicBp || ""}","${s.diastolicBp || ""}","${s.bloodGlucose || ""}","${s.bmi || ""}","${s.temperatureC || ""}","${s.poctType || ""}","${s.poctResult || ""}","${s.referralUrgency || "none"}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aether_screenings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRecordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await recordScreeningAction({}, formData);
      setFormState(res);
      if (res.success) {
        setShowRecordModal(false);
        // Reset form
        setRecName("");
        setRecPhone("");
        setRecSys("");
        setRecDia("");
        setRecGlu("");
        setRecWeight("");
        setRecHeight("");
        setRecTemp("");
        setRecNotes("");
      }
    });
  };

  const handleReferralSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await issueReferralAction({}, formData);
      setFormState(res);
      if (res.success) {
        setShowReferralModal(false);
      }
    });
  };

  const handleUpdateReferralStatus = (id: string, newStatus: string) => {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("status", newStatus);
    startTransition(async () => {
      await updateReferralStatusAction(formData);
      if (selectedReferral && selectedReferral.id === id) {
        setSelectedReferral({ ...selectedReferral, status: newStatus });
      }
    });
  };

  // Filtered Screenings
  const filteredScreenings = screenings.filter((s) => {
    const matchesSearch =
      s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.patientPhone && s.patientPhone.includes(searchQuery)) ||
      (s.screeningType && s.screeningType.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === "all" || s.screeningType === typeFilter;
    const matchesReferral =
      referralFilter === "all" ||
      (referralFilter === "yes" && s.requiresReferral) ||
      (referralFilter === "no" && !s.requiresReferral);

    return matchesSearch && matchesType && matchesReferral;
  });

  // Filtered Referrals
  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch =
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.facilityName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUrgency = urgencyFilter === "all" || r.urgency === urgencyFilter;
    return matchesSearch && matchesUrgency;
  });

  // Emergency red flags
  const emergencyScreenings = screenings.filter(
    (s) =>
      s.bpCategory === "hypertensive_crisis" ||
      s.glucoseCategory === "hypoglycemia" ||
      (s.spO2Percent && s.spO2Percent < 90) ||
      s.referralUrgency === "emergency"
  );

  const emergencyReferrals = referrals.filter((r) => r.urgency === "emergency");

  return (
    <div className="space-y-6">
      {/* Header Actions & Quick Operations Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setFormState(null);
              setShowRecordModal(true);
            }}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold shadow-xs hover:scale-[1.02] transition"
          >
            <Plus className="h-4 w-4" /> Record Screening
          </button>
          <button
            onClick={() => {
              setFormState(null);
              setRefScreeningId(null);
              setRefPatientName("");
              setRefPatientPhone("");
              setRefReason("");
              setRefSummary("");
              setShowReferralModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-900/20 bg-teal-50/70 px-4 py-2.5 text-xs font-bold text-teal-950 hover:bg-teal-100 transition shadow-2xs"
          >
            <Building2 className="h-4 w-4 text-teal-800" /> Issue Clinical Referral
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
            title="Export screening log to CSV for PPB audits"
          >
            <Download className="h-3.5 w-3.5 text-gray-500" /> Export CSV
          </button>
        </div>

        {formState?.error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-xs font-semibold text-red-800">
            {formState.error}
          </div>
        )}
        {formState?.success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800">
            {formState.success}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("screenings")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "screenings"
              ? "bg-teal-900 text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Activity className="h-3.5 w-3.5" /> All Screenings ({screenings.length})
        </button>
        <button
          onClick={() => setActiveTab("referrals")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "referrals"
              ? "bg-teal-900 text-white shadow-sm"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" /> Clinical Referrals Queue ({referrals.length})
        </button>
        <button
          onClick={() => setActiveTab("emergency")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "emergency"
              ? "bg-red-700 text-white shadow-sm"
              : "bg-white text-red-700 hover:bg-red-50"
          }`}
        >
          <Ambulance className="h-3.5 w-3.5" /> Emergency &amp; Red Flags ({emergencyScreenings.length + emergencyReferrals.length})
        </button>
      </div>

      {/* ── TAB 1: ALL SCREENINGS TABLE ── */}
      {activeTab === "screenings" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-gray-100 shadow-2xs">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient name, phone, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
              >
                <option value="all">All Screening Types</option>
                <option value="blood_pressure">Blood Pressure</option>
                <option value="blood_glucose">Blood Glucose</option>
                <option value="bmi_weight">BMI &amp; Weight</option>
                <option value="temperature">Temperature</option>
                <option value="wellness_check">Wellness Check</option>
                <option value="point_of_care_test">Point-of-Care (POCT)</option>
              </select>
              <select
                value={referralFilter}
                onChange={(e) => setReferralFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
              >
                <option value="all">All Referral Statuses</option>
                <option value="yes">Referral Flagged</option>
                <option value="no">Normal / No Referral</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Patient</th>
                  <th className="px-4 py-3.5">Screening Type</th>
                  <th className="px-4 py-3.5">Key Findings</th>
                  <th className="px-4 py-3.5">Referral Urgency</th>
                  <th className="px-4 py-3.5">Conducted By</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredScreenings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No screening records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredScreenings.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-[#0c1a14]">{s.patientName}</p>
                        <p className="text-[11px] text-gray-600">{s.patientPhone || (s.customer ? "Registered Customer" : "Walk-in")}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 capitalize">
                          {s.screeningType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 space-y-0.5">
                        {s.systolicBp && s.diastolicBp && (
                          <div className="text-[11px]">
                            <span className="font-semibold">BP: </span>
                            <span>{s.systolicBp}/{s.diastolicBp} mmHg</span>
                            <span className="text-gray-600 capitalize ml-1">({s.bpCategory?.replace(/_/g, " ")})</span>
                          </div>
                        )}
                        {s.bloodGlucose != null && (
                          <div className="text-[11px]">
                            <span className="font-semibold">Glucose: </span>
                            <span>{s.bloodGlucose} {s.glucoseUnit || "mmol/L"}</span>
                            <span className="text-gray-600 capitalize ml-1">({s.glucoseCategory?.replace(/_/g, " ")})</span>
                          </div>
                        )}
                        {s.bmi != null && (
                          <div className="text-[11px]">
                            <span className="font-semibold">BMI: </span>
                            <span>{s.bmi} kg/m²</span>
                            <span className="text-gray-600 capitalize ml-1">({s.bmiCategory?.replace(/_/g, " ")})</span>
                          </div>
                        )}
                        {s.temperatureC != null && (
                          <div className="text-[11px]">
                            <span className="font-semibold">Temp: </span>
                            <span>{s.temperatureC} °C</span>
                          </div>
                        )}
                        {s.poctType && (
                          <div className="text-[11px] text-indigo-900 font-medium">
                            <span>POCT ({s.poctType}): {s.poctResult || "Done"}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.requiresReferral ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.referralUrgency === "emergency"
                              ? "bg-red-100 text-red-800"
                              : s.referralUrgency === "urgent"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            <AlertCircle className="h-3 w-3" /> {s.referralUrgency || "Routine"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-teal-800 font-medium">
                            <CheckCircle2 className="h-3 w-3 text-teal-600" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 text-[11px]">
                        {s.conductedBy?.email || "Pharmacist"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 text-[11px]">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        {s.requiresReferral && (
                          <button
                            onClick={() => handleLaunchReferralFromScreening(s)}
                            className="font-bold text-amber-900 hover:text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg text-xs"
                            title="Generate official referral slip from this screening"
                          >
                            Refer →
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedScreening(s)}
                          className="font-bold text-teal-900 hover:text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg text-xs"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: CLINICAL REFERRALS QUEUE ── */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          {/* Referral Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-gray-100 shadow-2xs">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search referral code, patient, or facility..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
              />
            </div>
            <div>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
              >
                <option value="all">All Urgency Levels</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          {/* Referrals Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredReferrals.length === 0 ? (
              <div className="col-span-2 rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-500 text-xs">
                No clinical referrals found matching criteria.
              </div>
            ) : (
              filteredReferrals.map((r) => (
                <div
                  key={r.id}
                  className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs space-y-3 hover:border-teal-700/30 transition"
                >
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div>
                      <span className="font-mono font-bold text-xs text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md">
                        {r.referenceCode}
                      </span>
                      <span className="text-[11px] text-gray-600 ml-2">
                        {new Date(r.issuedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      r.urgency === "emergency"
                        ? "bg-red-100 text-red-800"
                        : r.urgency === "urgent"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-teal-100 text-teal-800"
                    }`}>
                      {r.urgency}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-600 text-[11px]">Patient: </span>
                    <span className="font-bold text-xs text-[#0c1a14]">{r.patientName}</span>
                    {r.patientPhone && <span className="text-gray-600 text-xs ml-1">({r.patientPhone})</span>}
                  </div>

                  <div className="text-xs">
                    <span className="text-gray-600 font-semibold">Referred To: </span>
                    <span className="font-bold text-teal-950">
                      {r.facilityName} {r.specialistType ? `(${r.specialistType})` : ""}
                    </span>
                    <span className="text-gray-600 block capitalize">Type: {r.destinationType}</span>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-700">
                    <span className="font-semibold block">Reason:</span>
                    <p className="line-clamp-2 leading-relaxed">{r.reason}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-600 text-[11px]">Status:</span>
                      <select
                        value={r.status}
                        onChange={(e) => handleUpdateReferralStatus(r.id, e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-teal-950"
                      >
                        <option value="issued">Issued</option>
                        <option value="shared">Shared with Patient</option>
                        <option value="completed">Completed / Attended</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <button
                      onClick={() => setSelectedReferral(r)}
                      className="font-bold text-teal-900 hover:text-teal-700 bg-teal-50 px-3 py-1 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" /> View Slip
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: EMERGENCY & RED FLAGS REGISTRY ── */}
      {activeTab === "emergency" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Ambulance className="h-6 w-6 text-red-700" />
              <h3 className="font-bold text-base text-red-950">Emergency EMS Protocols &amp; Red Flag Registry</h3>
            </div>
            <p className="text-xs leading-relaxed text-red-900">
              Patients with acute life-threatening signs (Hypertensive crisis &gt; 180/120 mmHg, severe hypoglycemia &lt; 3.9 mmol/L with symptoms, SpO2 &lt; 90%, chest pain, or suspected stroke) must be immediately transferred to a tertiary hospital emergency department via certified EMS ambulances.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
              {KENYAN_REFERRAL_DESTINATIONS.emergencyServices.map((ems, idx) => (
                <div key={idx} className="rounded-2xl bg-white p-3.5 border border-red-200 text-xs space-y-1">
                  <p className="font-bold text-gray-900">{ems.name}</p>
                  <p className="text-[10px] text-gray-500">{ems.description}</p>
                  <a href={`tel:${ems.number.replace(/[^0-9+]/g, "")}`} className="font-bold text-red-700 text-sm block mt-1">
                    📞 {ems.number}
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Flagged Critical Screening Cases</h4>
            {emergencyScreenings.length === 0 ? (
              <p className="text-xs text-gray-500 bg-white p-8 rounded-3xl border border-gray-100 text-center">
                No active critical emergency vitals recorded.
              </p>
            ) : (
              emergencyScreenings.map((s) => (
                <div key={s.id} className="rounded-2xl border border-red-200 bg-white p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-[#0c1a14]">{s.patientName}</span>
                    <span className="text-xs text-gray-600 ml-2">({s.patientPhone || "Walk-in"})</span>
                    <div className="text-xs text-red-700 font-semibold mt-1">
                      {s.bpCategory === "hypertensive_crisis" && `BP: ${s.systolicBp}/${s.diastolicBp} mmHg (Hypertensive Crisis!) `}
                      {s.glucoseCategory === "hypoglycemia" && `Glucose: ${s.bloodGlucose} mmol/L (Severe Hypoglycemia!) `}
                      {s.spO2Percent && s.spO2Percent < 90 && `SpO2: ${s.spO2Percent}% (Hypoxemia!) `}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLaunchReferralFromScreening(s)}
                      className="rounded-xl bg-red-700 text-white font-bold text-xs px-3 py-1.5 shadow-2xs hover:bg-red-800"
                    >
                      Dispatch Emergency Referral
                    </button>
                    <button
                      onClick={() => setSelectedScreening(s)}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      View Record
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: RECORD HEALTH SCREENING ── */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-800" />
                <h3 className="font-bold text-base text-[#0c1a14]">Record Health Screening</h3>
              </div>
              <button onClick={() => setShowRecordModal(false)} className="p-1.5 text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Rapid Preset Fill Toolbar */}
            <div className="flex flex-wrap items-center gap-2 bg-teal-50/60 p-3 rounded-2xl border border-teal-900/10 text-xs">
              <span className="font-bold text-teal-950 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Quick Autofill:
              </span>
              <button
                type="button"
                onClick={() => applyAdminPreset("bp")}
                className="px-2.5 py-1 rounded-lg bg-white font-semibold text-teal-900 border border-teal-100 hover:bg-teal-50"
              >
                Normal BP (120/80)
              </button>
              <button
                type="button"
                onClick={() => applyAdminPreset("glucose")}
                className="px-2.5 py-1 rounded-lg bg-white font-semibold text-teal-900 border border-teal-100 hover:bg-teal-50"
              >
                Fasting Glucose (5.4)
              </button>
              <button
                type="button"
                onClick={() => applyAdminPreset("wellness")}
                className="px-2.5 py-1 rounded-lg bg-white font-semibold text-teal-900 border border-teal-100 hover:bg-teal-50"
              >
                Full Wellness Panel
              </button>
              <button
                type="button"
                onClick={() => applyAdminPreset("malaria")}
                className="px-2.5 py-1 rounded-lg bg-white font-semibold text-teal-900 border border-teal-100 hover:bg-teal-50"
              >
                Malaria RDT (Neg)
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-6 text-xs">
              {/* Patient Selection */}
              <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="patientTypeOption"
                      checked={recPatientType === "walkin"}
                      onChange={() => setRecPatientType("walkin")}
                    />
                    <span>Walk-In Patient / Guest</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="patientTypeOption"
                      checked={recPatientType === "customer"}
                      onChange={() => setRecPatientType("customer")}
                    />
                    <span>Registered Patient Account</span>
                  </label>
                </div>

                {recPatientType === "customer" && (
                  <div>
                    <label className="font-bold text-gray-700">Select Customer Profile</label>
                    <select
                      value={recCustomerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 mt-1"
                    >
                      <option value="">-- Choose registered customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.phone || "No phone"})
                        </option>
                      ))}
                    </select>
                    <input type="hidden" name="customerId" value={recCustomerId} />
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="font-bold text-gray-700">Patient Full Name *</label>
                    <input
                      type="text"
                      name="patientName"
                      required
                      value={recName}
                      onChange={(e) => setRecName(e.target.value)}
                      placeholder="e.g. John Mwangi"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700">Phone Number</label>
                    <input
                      type="text"
                      name="patientPhone"
                      value={recPhone}
                      onChange={(e) => setRecPhone(e.target.value)}
                      placeholder="07..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700">Age</label>
                    <input
                      type="number"
                      name="patientAge"
                      value={recAge}
                      onChange={(e) => setRecAge(e.target.value)}
                      placeholder="45"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Screening Protocol */}
              <div>
                <label className="font-bold text-gray-700">Screening Protocol / Service</label>
                <select
                  name="screeningType"
                  value={recType}
                  onChange={(e) => setRecType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 mt-1"
                >
                  <option value="wellness_check">Comprehensive Basic Wellness Check</option>
                  <option value="blood_pressure">Blood Pressure Screening</option>
                  <option value="blood_glucose">Blood Glucose Testing</option>
                  <option value="bmi_weight">Weight &amp; BMI Assessment</option>
                  <option value="temperature">Temperature &amp; Fever Screening</option>
                  <option value="point_of_care_test">Authorized Point-of-Care Test (POCT)</option>
                </select>
              </div>

              {/* Vitals Measurement Inputs */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* BP */}
                <div className="rounded-2xl border border-gray-200 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-red-500" /> Blood Pressure
                    </span>
                    {recSys && recDia && (
                      <span className="text-[10px] font-bold text-teal-800 uppercase">
                        {liveBp.category.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <input
                        type="number"
                        name="systolicBp"
                        value={recSys}
                        onChange={(e) => setRecSys(e.target.value)}
                        placeholder="Systolic"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                      />
                      <span className="text-[10px] text-gray-600">Systolic</span>
                    </div>
                    <div>
                      <input
                        type="number"
                        name="diastolicBp"
                        value={recDia}
                        onChange={(e) => setRecDia(e.target.value)}
                        placeholder="Diastolic"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                      />
                      <span className="text-[10px] text-gray-600">Diastolic</span>
                    </div>
                    <div>
                      <input
                        type="number"
                        name="pulseRate"
                        value={recPulse}
                        onChange={(e) => setRecPulse(e.target.value)}
                        placeholder="Pulse"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                      />
                      <span className="text-[10px] text-gray-600">BPM</span>
                    </div>
                  </div>
                </div>

                {/* Glucose */}
                <div className="rounded-2xl border border-gray-200 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-teal-600" /> Blood Glucose
                    </span>
                    {recGlu && (
                      <span className="text-[10px] font-bold text-teal-800 uppercase">
                        {liveGlu.category.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        name="bloodGlucose"
                        value={recGlu}
                        onChange={(e) => setRecGlu(e.target.value)}
                        placeholder="Value"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <select
                        name="glucoseUnit"
                        value={recGluUnit}
                        onChange={(e) => setRecGluUnit(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-1 py-1.5"
                      >
                        <option value="mmol/L">mmol/L</option>
                        <option value="mg/dL">mg/dL</option>
                      </select>
                    </div>
                    <div>
                      <select
                        name="fastingStatus"
                        value={recFast}
                        onChange={(e) => setRecFast(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-1 py-1.5"
                      >
                        <option value="random">Random</option>
                        <option value="fasting">Fasting</option>
                        <option value="post_prandial">Post-meal</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Weight & BMI */}
                <div className="rounded-2xl border border-gray-200 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 flex items-center gap-1">
                      <Scale className="h-3.5 w-3.5 text-indigo-500" /> Weight &amp; Height (BMI)
                    </span>
                    {liveBmi.bmi && (
                      <span className="text-[10px] font-bold text-teal-800">
                        BMI: {liveBmi.bmi} ({liveBmi.category})
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        step="0.5"
                        name="weightKg"
                        value={recWeight}
                        onChange={(e) => setRecWeight(e.target.value)}
                        placeholder="Weight (kg)"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        name="heightCm"
                        value={recHeight}
                        onChange={(e) => setRecHeight(e.target.value)}
                        placeholder="Height (cm)"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Temp & SpO2 */}
                <div className="rounded-2xl border border-gray-200 p-3.5 space-y-2">
                  <span className="font-bold text-gray-800 flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-emerald-500" /> Temperature &amp; SpO2
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        step="0.1"
                        name="temperatureC"
                        value={recTemp}
                        onChange={(e) => setRecTemp(e.target.value)}
                        placeholder="Temp (°C)"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        name="spO2Percent"
                        value={recSpO2}
                        onChange={(e) => setRecSpO2(e.target.value)}
                        placeholder="SpO2 (%)"
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Point of Care Test Selection */}
              <div className="rounded-2xl border border-gray-200 p-3.5 space-y-2">
                <span className="font-bold text-gray-800">Authorized Point-of-Care Test (Optional)</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    name="poctType"
                    value={recPoctType}
                    onChange={(e) => setRecPoctType(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                  >
                    <option value="">-- No POCT test --</option>
                    <option value="malaria_rdt">Malaria RDT</option>
                    <option value="lipid_panel">Rapid Lipid Panel</option>
                    <option value="hba1c">HbA1c POCT Check</option>
                    <option value="urinalysis">Urinalysis Dipstick</option>
                    <option value="hiv_screening">HIV Assisted Screening</option>
                    <option value="hepatitis_b">Hepatitis B Screening</option>
                  </select>
                  <input
                    type="text"
                    name="poctResult"
                    value={recPoctResult}
                    onChange={(e) => setRecPoctResult(e.target.value)}
                    placeholder="Result (e.g. Negative / 5.2 mmol/L)"
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5"
                  />
                </div>
              </div>

              {/* Notes & Equipment */}
              <div className="space-y-2">
                <label className="font-bold text-gray-700">Pharmacist Clinical Notes &amp; Lifestyle Advice</label>
                <textarea
                  name="notes"
                  rows={2}
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                  placeholder="Notes on patient counselling, symptoms discussed, or advice given..."
                  className="w-full rounded-xl border border-gray-200 p-2.5"
                />
              </div>

              {/* Immediate Referral Trigger */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <label className="flex items-center gap-2 font-bold text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    name="issueReferralNow"
                    value="true"
                    checked={recIssueRef}
                    onChange={(e) => setRecIssueRef(e.target.checked)}
                  />
                  <span>Generate Official Clinical Referral Slip for this patient</span>
                </label>

                {recIssueRef && (
                  <div className="space-y-3 pt-2 border-t border-amber-200/60">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-gray-700 font-semibold">Destination</label>
                        <select
                          name="referralDestinationType"
                          value={recRefDest}
                          onChange={(e) => setRecRefDest(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 mt-0.5"
                        >
                          <option value="clinic">Clinic (Primary Care)</option>
                          <option value="hospital">Hospital (Secondary/Tertiary)</option>
                          <option value="laboratory">Laboratory (Pathology/Diagnostics)</option>
                          <option value="specialist">Specialist Consultation</option>
                          <option value="emergency_services">Emergency EMS</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-700 font-semibold">Facility Name</label>
                        <input
                          type="text"
                          name="referralFacilityName"
                          value={recRefFacility}
                          onChange={(e) => setRecRefFacility(e.target.value)}
                          placeholder="Facility Name"
                          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-gray-700 font-semibold">Urgency</label>
                        <select
                          name="referralUrgency"
                          value={recRefUrgency}
                          onChange={(e) => setRecRefUrgency(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 mt-0.5"
                        >
                          <option value="routine">Routine (1–2 weeks)</option>
                          <option value="urgent">Urgent (24–48 hours)</option>
                          <option value="emergency">Emergency (Immediate)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-700 font-semibold">Reason for Referral</label>
                      <input
                        type="text"
                        name="referralReason"
                        value={recRefReason}
                        onChange={(e) => setRecRefReason(e.target.value)}
                        placeholder="e.g. Stage 2 Hypertension (152/96 mmHg) requiring physician workup"
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 mt-0.5"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs px-5 py-2 font-bold disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Screening Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ISSUE STANDALONE CLINICAL REFERRAL ── */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-800" />
                <h3 className="font-bold text-base text-[#0c1a14]">Issue Pharmacist Clinical Referral</h3>
              </div>
              <button onClick={() => setShowReferralModal(false)} className="p-1.5 text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReferralSubmit} className="space-y-4 text-xs">
              {refScreeningId && <input type="hidden" name="screeningId" value={refScreeningId} />}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Patient Full Name *</label>
                  <input
                    type="text"
                    name="patientName"
                    required
                    value={refPatientName}
                    onChange={(e) => setRefPatientName(e.target.value)}
                    placeholder="Patient Name"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700">Patient Phone</label>
                  <input
                    type="text"
                    name="patientPhone"
                    value={refPatientPhone}
                    onChange={(e) => setRefPatientPhone(e.target.value)}
                    placeholder="07..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Destination Type *</label>
                  <select
                    name="destinationType"
                    required
                    value={refDestinationType}
                    onChange={(e) => setRefDestinationType(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 mt-1"
                  >
                    <option value="clinic">Clinic</option>
                    <option value="hospital">Hospital</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="specialist">Specialist</option>
                    <option value="emergency_services">Emergency EMS</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700">Facility / Clinic Name *</label>
                  <input
                    type="text"
                    name="facilityName"
                    required
                    value={refFacilityName}
                    onChange={(e) => setRefFacilityName(e.target.value)}
                    placeholder="e.g. Kenyatta National Hospital"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700">Urgency *</label>
                  <select
                    name="urgency"
                    required
                    value={refUrgency}
                    onChange={(e) => setRefUrgency(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 mt-1"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>

              {/* Quick Facility Picker */}
              <div className="bg-gray-50 p-2.5 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-gray-500">Auto-Select Kenyan Facility:</span>
                <div className="flex flex-wrap gap-1.5">
                  {KENYAN_REFERRAL_DESTINATIONS.hospitals.slice(0, 5).map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleFacilitySelect(h.name)}
                      className="px-2 py-0.5 text-[11px] rounded-lg bg-white border border-gray-200 hover:bg-teal-50"
                    >
                      {h.name.split(" ")[0]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleFacilitySelect("Pathologists Lancet Kenya (Cerba Lancet)")}
                    className="px-2 py-0.5 text-[11px] rounded-lg bg-white border border-gray-200 hover:bg-teal-50"
                  >
                    Lancet Lab
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Facility Phone / Contact</label>
                  <input
                    type="text"
                    name="facilityContact"
                    value={refFacilityContact}
                    onChange={(e) => setRefFacilityContact(e.target.value)}
                    placeholder="+254..."
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700">Specialist Department (Optional)</label>
                  <input
                    type="text"
                    name="specialistType"
                    value={refSpecialistType}
                    onChange={(e) => setRefSpecialistType(e.target.value)}
                    placeholder="e.g. Cardiology, Endocrinology"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700">Reason for Referral *</label>
                <input
                  type="text"
                  name="reason"
                  required
                  value={refReason}
                  onChange={(e) => setRefReason(e.target.value)}
                  placeholder="Primary clinical finding or concern triggering referral..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700">Clinical Findings &amp; Screening Summary *</label>
                <textarea
                  name="clinicalSummary"
                  required
                  rows={3}
                  value={refSummary}
                  onChange={(e) => setRefSummary(e.target.value)}
                  placeholder="Include recorded vitals, POCT test results, duration of symptoms, and observed signs..."
                  className="w-full rounded-xl border border-gray-200 p-2.5 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700">Pharmacist Initial Recommendations (Optional)</label>
                <input
                  type="text"
                  name="pharmacistRecommendations"
                  value={refRecommendations}
                  onChange={(e) => setRefRecommendations(e.target.value)}
                  placeholder="e.g. Recommend 24-hr Ambulatory BP Monitoring, Fasting Lipid Panel..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs px-5 py-2 font-bold disabled:opacity-50"
                >
                  {isPending ? "Issuing..." : "Generate Referral Slip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW / PRINT CLINICAL REFERRAL SLIP ── */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 print:shadow-none print:p-0 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-800" />
                <span className="font-bold text-sm text-[#0c1a14]">Official Pharmacist Referral Slip</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedReferral.referenceCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-900 bg-teal-50 rounded-xl hover:bg-teal-100"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button onClick={() => setSelectedReferral(null)} className="p-1.5 text-gray-400 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="border border-gray-300 rounded-2xl p-6 sm:p-8 space-y-5 bg-white text-[#0c1a14] text-xs">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="font-bold text-lg text-teal-950">{pharmacy.name}</h3>
                  <p className="text-gray-500">{pharmacy.address.full}</p>
                  <p className="text-gray-500">Tel: {pharmacy.phone} | Reg: PPB/PREM/04928</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Referral Ref</span>
                  <span className="font-mono font-bold text-sm text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                    {selectedReferral.referenceCode}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Date: {new Date(selectedReferral.issuedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-xl">
                <div>
                  <span className="text-gray-500 font-semibold">Patient Name: </span>
                  <span className="font-bold text-[#0c1a14]">{selectedReferral.patientName}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold">Contact: </span>
                  <span>{selectedReferral.patientPhone || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold">Urgency: </span>
                  <span className="font-bold uppercase text-red-700">{selectedReferral.urgency}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold">Destination: </span>
                  <span className="font-bold capitalize">{selectedReferral.destinationType}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-gray-700">Referred Facility / Specialty:</span>
                <p className="text-sm font-bold text-teal-950">
                  {selectedReferral.facilityName} {selectedReferral.specialistType ? `(${selectedReferral.specialistType})` : ""}
                </p>
                {selectedReferral.facilityContact && (
                  <p className="text-gray-500">Contact: {selectedReferral.facilityContact}</p>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-bold text-gray-700">Reason for Referral:</span>
                <p className="leading-relaxed bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 font-medium">
                  {selectedReferral.reason}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-gray-700">Clinical Screening Findings:</span>
                <p className="leading-relaxed whitespace-pre-line bg-gray-50 p-2.5 rounded-lg text-gray-700">
                  {selectedReferral.clinicalSummary}
                </p>
              </div>

              {selectedReferral.pharmacistRecommendations && (
                <div className="space-y-1">
                  <span className="font-bold text-gray-700">Pharmacist Initial Recommendations:</span>
                  <p className="leading-relaxed text-gray-700">
                    {selectedReferral.pharmacistRecommendations}
                  </p>
                </div>
              )}

              <div className="text-[10px] text-gray-500 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                * Note for receiving physician: Issued after pharmacy screening. Screening is a preliminary risk detection tool and is not a definitive diagnosis.
              </div>

              <div className="pt-4 border-t flex items-end justify-between">
                <div>
                  <p className="font-semibold text-gray-700">Referring Pharmacist:</p>
                  <p className="text-gray-500">Licensed Pharmacist on Duty</p>
                  <p className="text-[10px] text-gray-400">Aether Pharmacy Clinical Practice</p>
                </div>
                <div className="text-right">
                  <div className="w-36 border-b border-gray-400 mb-1"></div>
                  <p className="text-[10px] text-gray-500">Pharmacist Signature &amp; Official Stamp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW SCREENING DETAILS ── */}
      {selectedScreening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#0c1a14]">Health Screening Record Details</h3>
              <button onClick={() => setSelectedScreening(null)} className="p-1.5 text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-xl">
                <p className="font-bold text-sm text-[#0c1a14]">{selectedScreening.patientName}</p>
                <p className="text-gray-600 text-[11px]">
                  Phone: {selectedScreening.patientPhone || "N/A"} | Age: {selectedScreening.patientAge || "N/A"}
                </p>
                <p className="text-gray-500 text-[10px] mt-1">
                  Recorded on {new Date(selectedScreening.createdAt).toLocaleString()} by {selectedScreening.conductedBy?.email || "Pharmacist"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedScreening.systolicBp && (
                  <div className="rounded-xl border p-2.5">
                    <span className="font-semibold text-gray-500">Blood Pressure</span>
                    <p className="font-bold text-sm">{selectedScreening.systolicBp}/{selectedScreening.diastolicBp} mmHg</p>
                    <p className="text-[10px] text-teal-800 capitalize">{selectedScreening.bpCategory?.replace(/_/g, " ")}</p>
                  </div>
                )}
                {selectedScreening.bloodGlucose != null && (
                  <div className="rounded-xl border p-2.5">
                    <span className="font-semibold text-gray-500">Blood Glucose</span>
                    <p className="font-bold text-sm">{selectedScreening.bloodGlucose} {selectedScreening.glucoseUnit || "mmol/L"}</p>
                    <p className="text-[10px] text-teal-800 capitalize">{selectedScreening.fastingStatus} • {selectedScreening.glucoseCategory?.replace(/_/g, " ")}</p>
                  </div>
                )}
                {selectedScreening.bmi != null && (
                  <div className="rounded-xl border p-2.5">
                    <span className="font-semibold text-gray-500">BMI &amp; Weight</span>
                    <p className="font-bold text-sm">{selectedScreening.bmi} kg/m² ({selectedScreening.weightKg} kg)</p>
                    <p className="text-[10px] text-teal-800 capitalize">{selectedScreening.bmiCategory?.replace(/_/g, " ")}</p>
                  </div>
                )}
                {selectedScreening.temperatureC != null && (
                  <div className="rounded-xl border p-2.5">
                    <span className="font-semibold text-gray-500">Temperature</span>
                    <p className="font-bold text-sm">{selectedScreening.temperatureC} °C</p>
                  </div>
                )}
              </div>

              {selectedScreening.notes && (
                <div className="bg-teal-50/50 p-3 rounded-xl text-xs">
                  <span className="font-bold text-teal-950">Pharmacist Notes:</span>
                  <p className="text-gray-700 mt-0.5">{selectedScreening.notes}</p>
                </div>
              )}

              <div className="text-[11px] text-gray-500 pt-2 border-t">
                Equipment: {selectedScreening.equipmentUsed || "Calibrated clinical devices"}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {selectedScreening.requiresReferral && (
                  <button
                    onClick={() => {
                      setSelectedScreening(null);
                      handleLaunchReferralFromScreening(selectedScreening);
                    }}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    Issue Clinical Referral →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
