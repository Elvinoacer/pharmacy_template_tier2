"use client";

import { useState } from "react";
import { useTenantHref } from "../TenantLink";
import Link from "next/link";
import {
  Activity,
  Heart,
  Scale,
  Thermometer,
  ShieldCheck,
  Building2,
  PhoneCall,
  Stethoscope,
  Microscope,
  Ambulance,
  Sparkles,
  Info,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Share2,
  Printer,
  Compass,
} from "lucide-react";
import {
  classifyBloodPressure,
  classifyBloodGlucose,
  calculateAndClassifyBmi,
  classifyTemperature,
  AUTHORIZED_KENYAN_POCT_SERVICES,
  SCREENING_VS_DIAGNOSIS_PRINCIPLES,
  KENYAN_REFERRAL_DESTINATIONS,
} from "@/app/lib/screening-utils";
import { useTenantBrand } from "@/app/components/TenantBrand";

export function HealthScreeningHub() {
  const screeningHref = useTenantHref("/services/health-screenings");
  const contactHref = useTenantHref("/contact");
  const brand = useTenantBrand();
  // Interactive Calculator State
  const [systolic, setSystolic] = useState<string>("120");
  const [diastolic, setDiastolic] = useState<string>("80");
  const [bloodGlucose, setBloodGlucose] = useState<string>("5.4");
  const [glucoseUnit, setGlucoseUnit] = useState<string>("mmol/L");
  const [fastingStatus, setFastingStatus] = useState<string>("fasting");
  const [weightKg, setWeightKg] = useState<string>("68");
  const [heightCm, setHeightCm] = useState<string>("172");
  const [tempC, setTempC] = useState<string>("36.6");

  // Computed results
  const bpResult = classifyBloodPressure(
    systolic ? parseInt(systolic, 10) : null,
    diastolic ? parseInt(diastolic, 10) : null
  );

  const bgResult = classifyBloodGlucose(
    bloodGlucose ? parseFloat(bloodGlucose) : null,
    glucoseUnit,
    fastingStatus
  );

  const bmiResult = calculateAndClassifyBmi(
    weightKg ? parseFloat(weightKg) : null,
    heightCm ? parseFloat(heightCm) : null
  );

  const tempResult = classifyTemperature(
    tempC ? parseFloat(tempC) : null
  );

  const [activeTab, setActiveTab] = useState<"services" | "calculator" | "principles" | "referrals">("services");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>("all");
  const [referralSearch, setReferralSearch] = useState<string>("");

  // Preset loaders for the interactive calculator
  const applyPreset = (type: "healthy" | "prehypertension" | "diabetes_flag" | "fever") => {
    if (type === "healthy") {
      setSystolic("118");
      setDiastolic("76");
      setBloodGlucose("5.2");
      setGlucoseUnit("mmol/L");
      setFastingStatus("fasting");
      setWeightKg("65");
      setHeightCm("170");
      setTempC("36.6");
    } else if (type === "prehypertension") {
      setSystolic("136");
      setDiastolic("86");
      setBloodGlucose("5.8");
      setGlucoseUnit("mmol/L");
      setFastingStatus("fasting");
      setWeightKg("82");
      setHeightCm("172");
      setTempC("36.7");
    } else if (type === "diabetes_flag") {
      setSystolic("142");
      setDiastolic("90");
      setBloodGlucose("8.6");
      setGlucoseUnit("mmol/L");
      setFastingStatus("fasting");
      setWeightKg("88");
      setHeightCm("168");
      setTempC("36.8");
    } else if (type === "fever") {
      setSystolic("115");
      setDiastolic("75");
      setBloodGlucose("5.0");
      setGlucoseUnit("mmol/L");
      setFastingStatus("random");
      setWeightKg("70");
      setHeightCm("175");
      setTempC("38.8");
    }
  };

  const filteredServices = AUTHORIZED_KENYAN_POCT_SERVICES.filter((s) => {
    if (selectedServiceCategory === "all") return true;
    if (selectedServiceCategory === "vitals") {
      return ["blood_pressure", "bmi_weight", "temperature", "pulse_oximetry"].includes(s.type);
    }
    if (selectedServiceCategory === "metabolic") {
      return ["blood_glucose", "lipid_panel", "hba1c", "urinalysis"].includes(s.type);
    }
    if (selectedServiceCategory === "poct") {
      return ["malaria_rdt", "hiv_screening", "lipid_panel", "hba1c", "urinalysis"].includes(s.type);
    }
    return true;
  });

  const filteredHospitals = KENYAN_REFERRAL_DESTINATIONS.hospitals.filter((h) =>
    h.name.toLowerCase().includes(referralSearch.toLowerCase()) ||
    h.area.toLowerCase().includes(referralSearch.toLowerCase()) ||
    h.type.toLowerCase().includes(referralSearch.toLowerCase())
  );

  return (
    <div className="space-y-16">
      {/* Top Value Banner / Core Distinction */}
      <div className="rounded-3xl border border-teal-900/10 bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/60 p-6 md:p-10 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-teal-100/40 blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-100/90 px-3.5 py-1 text-xs font-bold text-teal-950">
              <ShieldCheck className="h-4 w-4 text-teal-800" />
              <span>Kenyan Good Pharmacy Practice (GPP) &amp; PPB Aligned</span>
            </div>
            <h1
              className="text-3xl font-extrabold text-[#0c1a14] md:text-4xl tracking-tight"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Health Screenings &amp; Preventive Care
            </h1>
            <p className="text-sm leading-relaxed text-[#5a6b62] md:text-base">
              Accessible walk-in vital checks, metabolic screening, and authorized point-of-care rapid tests conducted by licensed pharmacists using calibrated medical devices.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href={screeningHref}
              className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-xs md:text-sm font-bold shadow-md hover:scale-[1.02] transition transform"
            >
              <CalendarCheck className="h-4 w-4" /> Book a Screening
            </Link>
            <Link
              href={contactHref}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-900/15 bg-white px-5 py-3 text-xs md:text-sm font-semibold text-[#0c1a14] hover:bg-teal-50 shadow-2xs transition"
            >
              <PhoneCall className="h-4 w-4 text-teal-800" /> Call {brand.name}
            </Link>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-teal-900/10 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-teal-100/80 flex items-center justify-center text-teal-900 shrink-0">
              <Heart className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-[#0c1a14]">Blood Pressure</p>
              <p className="text-[11px] text-gray-500">Walk-in 5-min check</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-900 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-[#0c1a14]">Glucose &amp; HbA1c</p>
              <p className="text-[11px] text-gray-500">Instant capillary POCT</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-100/80 flex items-center justify-center text-indigo-900 shrink-0">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-[#0c1a14]">BMI &amp; Weight</p>
              <p className="text-[11px] text-gray-500">Precision stadiometer</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-900 shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-[#0c1a14]">Clinical Referrals</p>
              <p className="text-[11px] text-gray-500">Hospitals, Labs &amp; EMS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-gray-200 pb-4">
        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition ${
            activeTab === "services"
              ? "bg-teal-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Screening Services ({AUTHORIZED_KENYAN_POCT_SERVICES.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("calculator")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition ${
            activeTab === "calculator"
              ? "bg-teal-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Interactive Vitals Screener</span>
        </button>

        <button
          onClick={() => setActiveTab("principles")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition ${
            activeTab === "principles"
              ? "bg-teal-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <Info className="h-4 w-4" />
          <span>Screening vs Diagnosis</span>
        </button>

        <button
          onClick={() => setActiveTab("referrals")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold transition ${
            activeTab === "referrals"
              ? "bg-teal-900 text-white shadow-md"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Kenyan Referral Network</span>
        </button>
      </div>

      {/* ── TAB 1: SCREENING SERVICES CATALOGUE ── */}
      {activeTab === "services" && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#0c1a14]">Authorized Pharmacy Screenings</h2>
              <p className="text-xs text-[#5a6b62] mt-1">
                Conducted strictly under Kenyan Pharmacy &amp; Poisons Board (PPB) Good Pharmacy Practice standards.
              </p>
            </div>
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setSelectedServiceCategory("all")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  selectedServiceCategory === "all" ? "bg-white shadow-xs text-teal-950 font-bold" : "text-gray-600"
                }`}
              >
                All Services
              </button>
              <button
                onClick={() => setSelectedServiceCategory("vitals")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  selectedServiceCategory === "vitals" ? "bg-white shadow-xs text-teal-950 font-bold" : "text-gray-600"
                }`}
              >
                Core Vitals
              </button>
              <button
                onClick={() => setSelectedServiceCategory("metabolic")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  selectedServiceCategory === "metabolic" ? "bg-white shadow-xs text-teal-950 font-bold" : "text-gray-600"
                }`}
              >
                Metabolic &amp; Lipids
              </button>
              <button
                onClick={() => setSelectedServiceCategory("poct")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  selectedServiceCategory === "poct" ? "bg-white shadow-xs text-teal-950 font-bold" : "text-gray-600"
                }`}
              >
                Rapid POCT
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {filteredServices.map((service, idx) => (
              <div
                key={idx}
                className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 shadow-xs hover:border-[var(--brand)] hover:shadow-md transition space-y-4 flex flex-col justify-between backdrop-blur-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                      {service.category}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-700" /> PPB Verified
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0c1a14]">{service.title}</h3>
                  <p className="text-xs leading-relaxed text-[#5a6b62]">{service.description}</p>

                  <div className="rounded-2xl bg-gray-50/80 p-3.5 space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-gray-700">Clinical Purpose: </span>
                      <span className="text-gray-600">{service.clinicalUtility}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">Standard Target: </span>
                      <span className="text-teal-800 font-medium">{service.normalRange}</span>
                    </div>
                    <div>
                      <span className="font-bold text-amber-900">Referral Threshold: </span>
                      <span className="text-gray-600">{service.referralCriteria}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-600 italic">Equipment: {service.equipment.split(" ")[0]}...</span>
                  <Link
                    href={screeningHref}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-900 hover:text-teal-700"
                  >
                    <span>Book Check</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Calibrated Equipment & Staff Qualification Banner */}
          <div className="rounded-3xl border border-teal-900/10 bg-teal-950 p-6 md:p-8 text-white space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-800/80 px-3 py-0.5 text-xs font-semibold text-teal-200">
                  <ShieldCheck className="h-3.5 w-3.5" /> Staff Qualifications &amp; Calibration
                </div>
                <h3 className="text-lg font-bold">Standard Operating Procedures &amp; Equipment Maintenance</h3>
                <p className="text-xs leading-relaxed text-teal-100/90">
                  All screening equipment at {brand.name} is routine-calibrated in compliance with Kenya Bureau of Standards (KEBS) and Pharmacy and Poisons Board (PPB) Good Pharmacy Practice (GPP). Tests are performed exclusively by registered Pharmacists and certified Pharmaceutical Technologists.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href={screeningHref}
                  className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-teal-950 hover:bg-teal-50 transition inline-flex items-center gap-2"
                >
                  <CalendarCheck className="h-4 w-4" /> Book Screening Session
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: INTERACTIVE VITALS SCREENER & METERS ── */}
      {activeTab === "calculator" && (
        <div className="space-y-8">
          <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 sm:p-8 shadow-sm space-y-6 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#0c1a14]">Interactive Vitals Screener &amp; BMI Monitor</h2>
                <p className="text-xs text-[#5a6b62] mt-1">
                  Enter your vital measurements to see real-time clinical classifications, healthy target ranges, and guidance.
                </p>
              </div>
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500">Test Presets:</span>
                <button
                  onClick={() => applyPreset("healthy")}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                >
                  Healthy Vitals
                </button>
                <button
                  onClick={() => applyPreset("prehypertension")}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100"
                >
                  Elevated BP
                </button>
                <button
                  onClick={() => applyPreset("diabetes_flag")}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-800 hover:bg-red-100"
                >
                  High Glucose
                </button>
                <button
                  onClick={() => applyPreset("fever")}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-50 text-orange-800 hover:bg-orange-100"
                >
                  Fever Flag
                </button>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
              {/* Input Form Controls */}
              <div className="lg:col-span-5 space-y-5 bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Input Measurements</h3>

                {/* Blood Pressure Inputs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-red-500" />
                    <span>Blood Pressure (mmHg)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        placeholder="Systolic (120)"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
                      />
                      <span className="text-[10px] text-gray-600 block mt-0.5">Systolic (Upper)</span>
                    </div>
                    <div>
                      <input
                        type="number"
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        placeholder="Diastolic (80)"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
                      />
                      <span className="text-[10px] text-gray-600 block mt-0.5">Diastolic (Lower)</span>
                    </div>
                  </div>
                </div>

                {/* Blood Glucose Inputs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-teal-600" />
                    <span>Blood Glucose</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={bloodGlucose}
                      onChange={(e) => setBloodGlucose(e.target.value)}
                      placeholder="Value"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
                    />
                    <select
                      value={glucoseUnit}
                      onChange={(e) => setGlucoseUnit(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs focus:border-teal-700 focus:outline-none"
                    >
                      <option value="mmol/L">mmol/L</option>
                      <option value="mg/dL">mg/dL</option>
                    </select>
                    <select
                      value={fastingStatus}
                      onChange={(e) => setFastingStatus(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs focus:border-teal-700 focus:outline-none"
                    >
                      <option value="fasting">Fasting</option>
                      <option value="random">Random</option>
                    </select>
                  </div>
                </div>

                {/* Weight & Height Inputs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Body Metrics (Weight &amp; Height)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        step="0.5"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="Weight (kg)"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
                      />
                      <span className="text-[10px] text-gray-600 block mt-0.5">Weight (kg)</span>
                    </div>
                    <div>
                      <input
                        type="number"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        placeholder="Height (cm)"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
                      />
                      <span className="text-[10px] text-gray-600 block mt-0.5">Height (cm)</span>
                    </div>
                  </div>
                </div>

                {/* Temperature Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Thermometer className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Body Temperature (°C)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={tempC}
                    onChange={(e) => setTempC(e.target.value)}
                    placeholder="36.6"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs focus:border-teal-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Real-time Classification & Visual Meter Display */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Live Clinical Feedback</h3>

                {/* Blood Pressure Meter Card */}
                <div className={`rounded-2xl p-4 border transition ${
                  bpResult.severity === "critical"
                    ? "bg-red-50/80 border-red-200"
                    : bpResult.severity === "danger"
                    ? "bg-orange-50/80 border-orange-200"
                    : bpResult.severity === "warning"
                    ? "bg-amber-50/80 border-amber-200"
                    : "bg-emerald-50/70 border-emerald-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-red-500" /> Blood Pressure Evaluation
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      bpResult.severity === "critical"
                        ? "bg-red-200 text-red-950"
                        : bpResult.severity === "danger"
                        ? "bg-orange-200 text-orange-950"
                        : bpResult.severity === "warning"
                        ? "bg-amber-200 text-amber-950"
                        : "bg-emerald-200 text-emerald-950"
                    }`}>
                      {bpResult.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mt-2 leading-relaxed">{bpResult.guidance}</p>
                </div>

                {/* Blood Glucose Meter Card */}
                <div className={`rounded-2xl p-4 border transition ${
                  bgResult.severity === "critical" || bgResult.severity === "danger"
                    ? "bg-red-50/80 border-red-200"
                    : bgResult.severity === "warning"
                    ? "bg-amber-50/80 border-amber-200"
                    : "bg-teal-50/70 border-teal-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-teal-600" /> Blood Glucose Assessment
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      bgResult.severity === "critical" || bgResult.severity === "danger"
                        ? "bg-red-200 text-red-950"
                        : bgResult.severity === "warning"
                        ? "bg-amber-200 text-amber-950"
                        : "bg-teal-200 text-teal-950"
                    }`}>
                      {bgResult.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mt-2 leading-relaxed">{bgResult.guidance}</p>
                </div>

                {/* BMI Meter Card */}
                <div className="rounded-2xl p-4 border border-indigo-100 bg-indigo-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-indigo-500" /> Body Mass Index (BMI)
                    </span>
                    {bmiResult.bmi && (
                      <span className="text-xs font-bold text-indigo-950 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                        {bmiResult.bmi} kg/m² ({bmiResult.category.replace(/_/g, " ")})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{bmiResult.guidance}</p>
                  {bmiResult.idealWeightRange && (
                    <p className="text-[11px] font-medium text-indigo-900">
                      Target Healthy Weight for your height ({heightCm} cm):{" "}
                      <span className="font-bold">{bmiResult.idealWeightRange.minKg} – {bmiResult.idealWeightRange.maxKg} kg</span>
                    </p>
                  )}
                </div>

                {/* Temperature Meter Card */}
                <div className={`rounded-2xl p-4 border transition ${
                  tempResult.severity === "danger"
                    ? "bg-orange-50/80 border-orange-200"
                    : tempResult.severity === "warning"
                    ? "bg-amber-50/80 border-amber-200"
                    : "bg-gray-50 border-gray-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Thermometer className="h-3.5 w-3.5 text-emerald-500" /> Body Temperature
                    </span>
                    <span className="text-xs font-bold text-gray-900 bg-white px-2.5 py-0.5 rounded-full border border-gray-200">
                      {tempResult.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mt-2 leading-relaxed">{tempResult.guidance}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: SCREENING VS DIAGNOSIS CLINICAL PRINCIPLES ── */}
      {activeTab === "principles" && (
        <div className="space-y-8">
          <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 sm:p-10 shadow-sm space-y-6 backdrop-blur-xl">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-950">
                <Info className="h-4 w-4 text-amber-800" />
                <span>Foundational Healthcare Principle</span>
              </div>
              <h2 className="text-2xl font-bold text-[#0c1a14]">
                {SCREENING_VS_DIAGNOSIS_PRINCIPLES.coreDistinction}
              </h2>
              <p className="text-sm leading-relaxed text-[#5a6b62]">
                {SCREENING_VS_DIAGNOSIS_PRINCIPLES.explanation}
              </p>
            </div>

            {/* Comparison Table */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-bold text-teal-950">Pharmacy Health Screening</th>
                    <th className="p-4 font-bold text-teal-950">Definitive Medical Diagnosis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="p-4 text-gray-700">
                      <span className="font-semibold block text-[#0c1a14]">Preliminary Assessment:</span>
                      Identifies physiological deviations (e.g. BP 148/92, glucose 8.4 mmol/L) in asymptomatic individuals.
                    </td>
                    <td className="p-4 text-gray-700">
                      <span className="font-semibold block text-[#0c1a14]">Comprehensive Diagnostic Workup:</span>
                      Conducted by a physician through full medical history, clinical exam, and specialized imaging/labs.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">
                      <span className="font-semibold block text-[#0c1a14]">Frontline Accessibility:</span>
                      Walk-in, rapid, low barrier to entry in the local community with immediate preliminary findings.
                    </td>
                    <td className="p-4 text-gray-700">
                      <span className="font-semibold block text-[#0c1a14]">Definitive Treatment Planning:</span>
                      Determines underlying etiology, clinical disease staging, and initiates prescribed long-term pharmacotherapy.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-700">
                      <span className="font-semibold block text-[#0c1a14]">Triage &amp; Referral Trigger:</span>
                      Flags individuals who require formal physician evaluation or laboratory confirmation.
                    </td>
                    <td className="p-4 text-gray-700">
                      <span className="font-semibold block text-[#0c1a14]">Formal Patient Care Plan:</span>
                      Coordinated across clinics, specialist practices, hospital inpatient units, and allied health.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Key Tenets Grid */}
            <div className="grid gap-4 sm:grid-cols-2 pt-4">
              {SCREENING_VS_DIAGNOSIS_PRINCIPLES.keyTenets.map((tenet, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-[#0c1a14] flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" />
                    <span>{tenet.title}</span>
                  </h4>
                  <p className="text-xs text-[#5a6b62] leading-relaxed">{tenet.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: KENYAN REFERRAL DIRECTORY & EMERGENCY ── */}
      {activeTab === "referrals" && (
        <div className="space-y-8">
          {/* Emergency EMS Header Banner */}
          <div className="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50 p-6 md:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shrink-0">
                <Ambulance className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-950">24/7 Kenyan Emergency &amp; EMS Hotlines</h3>
                <p className="text-xs text-red-900/90">
                  Immediate paramedic and ambulance dispatch for acute red flags (chest pain, stroke symptoms, hypertensive emergencies).
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {KENYAN_REFERRAL_DESTINATIONS.emergencyServices.map((ems, idx) => (
                <div key={idx} className="rounded-2xl bg-white p-4 border border-red-200 shadow-2xs space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 block">
                    {ems.tollFree ? "Toll-Free Emergency" : "Certified 24/7 EMS"}
                  </span>
                  <p className="text-sm font-bold text-[#0c1a14]">{ems.name}</p>
                  <p className="text-xs text-gray-500">{ems.description}</p>
                  <a
                    href={`tel:${ems.number.replace(/[^0-9+]/g, "")}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 px-3 py-1.5 rounded-xl mt-2 hover:bg-red-100 transition"
                  >
                    <PhoneCall className="h-3.5 w-3.5" /> Call {ems.number}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Tertiary & County Referral Hospitals */}
          <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 sm:p-8 shadow-sm space-y-6 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#0c1a14]">Referral Hospitals &amp; Medical Centres</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pre-configured destinations for secondary and tertiary care escalation.
                </p>
              </div>
              <input
                type="text"
                placeholder="Filter hospital or area..."
                value={referralSearch}
                onChange={(e) => setReferralSearch(e.target.value)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs focus:border-teal-700 focus:outline-none min-w-[200px]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredHospitals.map((h, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 p-4 space-y-2 hover:border-teal-700/30 transition">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                    {h.type}
                  </span>
                  <p className="text-xs font-bold text-[#0c1a14]">{h.name}</p>
                  <p className="text-[11px] text-gray-500">{h.area}</p>
                  <a
                    href={`tel:${h.contact.replace(/[^0-9+]/g, "")}`}
                    className="text-xs text-teal-900 font-semibold flex items-center gap-1 hover:underline pt-1"
                  >
                    <PhoneCall className="h-3 w-3" /> {h.contact}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Laboratories & Specialists Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Laboratories */}
            <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 shadow-sm space-y-4 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Microscope className="h-5 w-5 text-teal-800" />
                <h4 className="font-bold text-sm text-[#0c1a14]">Accredited Diagnostic Laboratories</h4>
              </div>
              <div className="space-y-3">
                {KENYAN_REFERRAL_DESTINATIONS.laboratories.map((lab, i) => (
                  <div key={i} className="rounded-2xl bg-gray-50 p-3.5 space-y-1 text-xs">
                    <p className="font-bold text-[#0c1a14]">{lab.name}</p>
                    <p className="text-gray-500">{lab.type} • {lab.area}</p>
                    <p className="text-teal-900 font-medium">Tel: {lab.contact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Specialists */}
            <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 shadow-sm space-y-4 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-teal-800" />
                <h4 className="font-bold text-sm text-[#0c1a14]">Specialist Referral Disciplines</h4>
              </div>
              <div className="space-y-3">
                {KENYAN_REFERRAL_DESTINATIONS.specialists.map((spec, i) => (
                  <div key={i} className="rounded-2xl bg-gray-50 p-3.5 space-y-1 text-xs">
                    <p className="font-bold text-[#0c1a14]">{spec.specialty}</p>
                    <p className="text-gray-600 leading-relaxed">{spec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
