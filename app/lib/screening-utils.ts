// ── Types & Classifications ──────────────────────────────────

export type BpCategory =
  | "normal"
  | "elevated"
  | "stage_1_hypertension"
  | "stage_2_hypertension"
  | "hypertensive_crisis";

export type GlucoseCategory =
  | "hypoglycemia"
  | "normal"
  | "impaired_pre_diabetes"
  | "diabetes_range";

export type BmiCategory =
  | "underweight"
  | "normal"
  | "overweight"
  | "obese_class_1"
  | "obese_class_2"
  | "obese_class_3";

export type TempCategory =
  | "hypothermia"
  | "normal"
  | "low_grade_fever"
  | "high_fever";

export type PoctType =
  | "malaria_rdt"
  | "lipid_panel"
  | "hba1c"
  | "urinalysis"
  | "hiv_screening"
  | "hepatitis_b"
  | "hepatitis_c"
  | "covid_antigen"
  | "pulse_oximetry";

export type ReferralDestination =
  | "clinic"
  | "hospital"
  | "laboratory"
  | "specialist"
  | "emergency_services";

export type ReferralUrgency = "routine" | "urgent" | "emergency";

// ── Clinical Classification Helpers ──────────────────────────

/**
 * Classifies Blood Pressure based on AHA / WHO / Kenyan Clinical Practice Guidelines.
 */
export function classifyBloodPressure(
  systolic?: number | null,
  diastolic?: number | null,
): { category: BpCategory; label: string; severity: "normal" | "warning" | "danger" | "critical"; guidance: string } {
  if (systolic == null || diastolic == null || systolic <= 0 || diastolic <= 0) {
    return {
      category: "normal",
      label: "Not recorded",
      severity: "normal",
      guidance: "Record systolic and diastolic readings to assess blood pressure.",
    };
  }

  // Hypertensive Crisis
  if (systolic > 180 || diastolic > 120) {
    return {
      category: "hypertensive_crisis",
      label: "Hypertensive Crisis (Emergency)",
      severity: "critical",
      guidance:
        "Emergency red flag: Systolic > 180 mmHg or Diastolic > 120 mmHg. If accompanied by chest pain, shortness of breath, vision changes, or severe headache, immediate emergency hospital transfer is required.",
    };
  }

  // Stage 2 Hypertension
  if (systolic >= 140 || diastolic >= 90) {
    return {
      category: "stage_2_hypertension",
      label: "Stage 2 Hypertension",
      severity: "danger",
      guidance:
        "Consistent readings ≥ 140/90 mmHg require medical evaluation by a physician or clinic for formal diagnosis, lifestyle modifications, and medication review.",
    };
  }

  // Stage 1 Hypertension
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
    return {
      category: "stage_1_hypertension",
      label: "Stage 1 Hypertension",
      severity: "warning",
      guidance:
        "Systolic 130–139 mmHg or Diastolic 80–89 mmHg. Advise dietary sodium reduction, exercise, stress management, and scheduled re-screening within 2–4 weeks.",
    };
  }

  // Elevated Blood Pressure
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
    return {
      category: "elevated",
      label: "Elevated Blood Pressure",
      severity: "warning",
      guidance:
        "Systolic 120–129 mmHg with diastolic < 80 mmHg. Lifestyle modifications recommended to prevent progression to clinical hypertension.",
    };
  }

  // Normal Blood Pressure
  return {
    category: "normal",
    label: "Normal Blood Pressure",
    severity: "normal",
    guidance: "Reading is within optimal range (< 120/80 mmHg). Maintain heart-healthy diet and regular activity.",
  };
}

/**
 * Classifies Blood Glucose (mmol/L) according to IDF / ADA / Kenya National Diabetes Guidelines.
 */
export function classifyBloodGlucose(
  value?: number | null,
  unit: string = "mmol/L",
  fastingStatus: string = "random",
): { category: GlucoseCategory; label: string; severity: "normal" | "warning" | "danger" | "critical"; guidance: string; mmolValue: number | null } {
  if (value == null || value <= 0) {
    return {
      category: "normal",
      label: "Not recorded",
      severity: "normal",
      guidance: "Record blood glucose level to assess glycemic profile.",
      mmolValue: null,
    };
  }

  // Normalise to mmol/L if provided in mg/dL (1 mmol/L = 18.018 mg/dL)
  const mmol = unit.toLowerCase().includes("mg") ? Number((value / 18.018).toFixed(2)) : Number(value.toFixed(2));
  const isFasting = fastingStatus === "fasting";

  // Hypoglycemia check
  if (mmol < 3.9) {
    return {
      category: "hypoglycemia",
      label: "Hypoglycemia (Low Blood Sugar)",
      severity: "critical",
      guidance:
        "Glucose < 3.9 mmol/L (< 70 mg/dL). Immediate fast-acting carbohydrate needed (15–20g oral glucose / fruit juice). Recheck in 15 minutes. Investigate cause if on insulin or sulfonylureas.",
      mmolValue: mmol,
    };
  }

  if (isFasting) {
    if (mmol >= 7.0) {
      return {
        category: "diabetes_range",
        label: "Elevated Fasting Glucose (Diabetes Range)",
        severity: "danger",
        guidance:
          "Fasting glucose ≥ 7.0 mmol/L (≥ 126 mg/dL) on screening warrants formal confirmatory laboratory testing (Fasting Plasma Glucose / HbA1c) and clinician referral. Note: Screening is not a definitive diagnosis.",
        mmolValue: mmol,
      };
    }
    if (mmol >= 5.6) {
      return {
        category: "impaired_pre_diabetes",
        label: "Impaired Fasting Glucose (Prediabetes)",
        severity: "warning",
        guidance:
          "Fasting glucose 5.6–6.9 mmol/L (100–125 mg/dL). Lifestyle intervention (nutrition, physical activity, weight management) recommended to prevent progression to type 2 diabetes.",
        mmolValue: mmol,
      };
    }
    return {
      category: "normal",
      label: "Normal Fasting Glucose",
      severity: "normal",
      guidance: "Fasting glucose is within target healthy range (3.9–5.5 mmol/L).",
      mmolValue: mmol,
    };
  } else {
    // Random / Post-prandial glucose
    if (mmol >= 11.1) {
      return {
        category: "diabetes_range",
        label: "Elevated Random Glucose (Diabetes Range)",
        severity: "danger",
        guidance:
          "Random glucose ≥ 11.1 mmol/L (≥ 200 mg/dL) requires physician referral and formal laboratory diagnostic workup.",
        mmolValue: mmol,
      };
    }
    if (mmol >= 7.8) {
      return {
        category: "impaired_pre_diabetes",
        label: "Impaired Glucose Tolerance (Elevated)",
        severity: "warning",
        guidance:
          "Random glucose 7.8–11.0 mmol/L (140–199 mg/dL). Suggest fasting plasma glucose or laboratory HbA1c test and dietary review.",
        mmolValue: mmol,
      };
    }
    return {
      category: "normal",
      label: "Normal Random Glucose",
      severity: "normal",
      guidance: "Random glucose is in optimal healthy range (< 7.8 mmol/L / < 140 mg/dL).",
      mmolValue: mmol,
    };
  }
}

/**
 * Calculates Body Mass Index (BMI) and provides classification and healthy weight targets.
 */
export function calculateAndClassifyBmi(
  weightKg?: number | null,
  heightCm?: number | null,
): {
  bmi: number | null;
  category: BmiCategory;
  label: string;
  severity: "normal" | "warning" | "danger";
  idealWeightRange: { minKg: number; maxKg: number } | null;
  guidance: string;
} {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return {
      bmi: null,
      category: "normal",
      label: "Not calculated",
      severity: "normal",
      idealWeightRange: null,
      guidance: "Enter both weight (kg) and height (cm) to calculate BMI.",
    };
  }

  const heightM = heightCm / 100;
  const bmiVal = Number((weightKg / (heightM * heightM)).toFixed(1));
  const minIdeal = Number((18.5 * heightM * heightM).toFixed(1));
  const maxIdeal = Number((24.9 * heightM * heightM).toFixed(1));
  const idealRange = { minKg: minIdeal, maxKg: maxIdeal };

  if (bmiVal < 18.5) {
    return {
      bmi: bmiVal,
      category: "underweight",
      label: "Underweight (BMI < 18.5)",
      severity: "warning",
      idealWeightRange: idealRange,
      guidance:
        "BMI indicates underweight. Recommend nutritional assessment to ensure adequate caloric and micronutrient intake.",
    };
  }

  if (bmiVal <= 24.9) {
    return {
      bmi: bmiVal,
      category: "normal",
      label: "Healthy Weight (BMI 18.5 – 24.9)",
      severity: "normal",
      idealWeightRange: idealRange,
      guidance: "BMI is in the optimal healthy weight range. Continue balanced nutrition and routine physical activity.",
    };
  }

  if (bmiVal <= 29.9) {
    return {
      bmi: bmiVal,
      category: "overweight",
      label: "Overweight (BMI 25.0 – 29.9)",
      severity: "warning",
      idealWeightRange: idealRange,
      guidance:
        "BMI indicates overweight. Modest weight reduction (5–10%) significantly lowers cardiovascular, hypertension, and diabetes risks.",
    };
  }

  if (bmiVal <= 34.9) {
    return {
      bmi: bmiVal,
      category: "obese_class_1",
      label: "Obesity Class I (BMI 30.0 – 34.9)",
      severity: "danger",
      idealWeightRange: idealRange,
      guidance:
        "Class I Obesity. Structured lifestyle interventions, dietary counselling, and metabolic risk screening (BP, glucose, lipids) advised.",
    };
  }

  if (bmiVal <= 39.9) {
    return {
      bmi: bmiVal,
      category: "obese_class_2",
      label: "Obesity Class II (BMI 35.0 – 39.9)",
      severity: "danger",
      idealWeightRange: idealRange,
      guidance:
        "Class II Obesity. Higher risk of cardiometabolic complications. Comprehensive medical assessment and clinical nutrition plan recommended.",
    };
  }

  return {
    bmi: bmiVal,
    category: "obese_class_3",
    label: "Obesity Class III (BMI ≥ 40.0)",
    severity: "danger",
    idealWeightRange: idealRange,
    guidance:
      "Class III Severe Obesity. Multidisciplinary medical care including specialist metabolic and cardiovascular assessment recommended.",
  };
}

/**
 * Classifies body temperature (°C).
 */
export function classifyTemperature(
  tempC?: number | null,
): { category: TempCategory; label: string; severity: "normal" | "warning" | "danger" | "critical"; guidance: string } {
  if (tempC == null || tempC <= 0) {
    return {
      category: "normal",
      label: "Not recorded",
      severity: "normal",
      guidance: "Record temperature to screen for fever or hypothermia.",
    };
  }

  if (tempC < 35.5) {
    return {
      category: "hypothermia",
      label: "Hypothermia (< 35.5°C)",
      severity: "warning",
      guidance: "Temperature is abnormally low. Warm fluids, active rewarming, and medical evaluation if persistent.",
    };
  }

  if (tempC <= 37.2) {
    return {
      category: "normal",
      label: "Normal Temperature (35.5°C – 37.2°C)",
      severity: "normal",
      guidance: "Body temperature is within normal physiological limits.",
    };
  }

  if (tempC <= 38.3) {
    return {
      category: "low_grade_fever",
      label: "Low-Grade Fever (37.3°C – 38.3°C)",
      severity: "warning",
      guidance: "Mild elevation. Stay well-hydrated, monitor symptoms, and evaluate for infectious triggers (e.g. viral cold, malaria in endemic regions).",
    };
  }

  return {
    category: "high_fever",
    label: "High Fever (> 38.3°C / > 101°F)",
    severity: "danger",
    guidance:
      "High fever. Evaluate with authorized Point-of-Care tests (e.g., Malaria RDT in Kenya) and refer to clinic/hospital if accompanied by severe lethargy, vomiting, stiff neck, or lasting > 3 days.",
  };
}

// ── Point-of-Care Tests (POCT) & Clinical Screening Guidelines ─

export const AUTHORIZED_KENYAN_POCT_SERVICES = [
  {
    type: "blood_pressure",
    title: "Blood Pressure Checks",
    category: "Cardiovascular Vitals",
    description: "Automated & manual oscillometric screening for hypertension, hypotension, and irregular pulse.",
    equipment: "Calibrated digital / aneroid sphygmomanometer with validated cuff sizes.",
    clinicalUtility: "Identifies asymptomatic hypertension (the 'silent killer') and monitors treatment efficacy.",
    normalRange: "Systolic < 120 mmHg and Diastolic < 80 mmHg",
    referralCriteria: "Systolic ≥ 140 mmHg, Diastolic ≥ 90 mmHg, or any reading > 180/120 mmHg (Emergency).",
  },
  {
    type: "blood_glucose",
    title: "Blood Glucose Testing",
    category: "Metabolic Screening",
    description: "Fingerstick capillary blood glucose test (Fasting or Random).",
    equipment: "Calibrated ISO 15197 compliant glucometer with single-use sterile lancets and test strips.",
    clinicalUtility: "Screens for early prediabetes, undiagnosed type 2 diabetes, and acute hypoglycemia.",
    normalRange: "Fasting: 3.9–5.5 mmol/L (70–99 mg/dL) | Random: < 7.8 mmol/L (< 140 mg/dL)",
    referralCriteria: "Fasting ≥ 7.0 mmol/L, Random ≥ 11.1 mmol/L, or any glucose < 3.9 mmol/L (Hypoglycemia).",
  },
  {
    type: "bmi_weight",
    title: "Weight & BMI Assessment",
    category: "Anthropometric Health",
    description: "Digital medical-grade weight measurement, standing height, and Body Mass Index computation.",
    equipment: "Calibrated medical floor scale and precision stadiometer.",
    clinicalUtility: "Assesses nutritional status, obesity classification, and metabolic syndrome risk.",
    normalRange: "BMI 18.5 – 24.9 kg/m²",
    referralCriteria: "BMI ≥ 35.0 (Class II/III Obesity) or BMI < 16.0 (Severe Malnutrition) with comorbid symptoms.",
  },
  {
    type: "temperature",
    title: "Temperature & Vital Screening",
    category: "General Vitals",
    description: "Non-contact infrared or digital clinical thermometry and pulse rate assessment.",
    equipment: "Clinically certified infrared / digital thermometer.",
    clinicalUtility: "Rapid detection of systemic pyrexia, infectious episodes, and hypothermia.",
    normalRange: "36.1°C – 37.2°C (97.0°F – 99.0°F)",
    referralCriteria: "Temperature > 38.5°C lasting > 48h, fever in infants < 3 months, or fever with altered sensorium.",
  },
  {
    type: "malaria_rdt",
    title: "Malaria Rapid Diagnostic Test (mRDT)",
    category: "Infectious Disease POCT",
    description: "Antigen-detecting point-of-care cassette (HRP2 / pLDH) for Plasmodium species in febrile patients.",
    equipment: "PPB & WHO prequalified Malaria Rapid Test Kits with sterile lancets and buffer.",
    clinicalUtility: "Confirms malaria parasitaemia before dispensing Artemisinin-based Combination Therapy (ACTs).",
    normalRange: "Negative (Non-reactive)",
    referralCriteria: "Positive result with signs of severe malaria (prostration, persistent vomiting, dark urine, jaundice, respiratory distress) -> Hospital Emergency.",
  },
  {
    type: "lipid_panel",
    title: "Rapid Lipid / Cholesterol Profile",
    category: "Cardiovascular POCT",
    description: "Point-of-care capillary blood check for Total Cholesterol, HDL, LDL, and Triglycerides.",
    equipment: "Point-of-Care Cholestech / Multi-parameter Lipid Analyser.",
    clinicalUtility: "Assesses atherosclerotic cardiovascular disease (ASCVD) risk and guides lifestyle counselling.",
    normalRange: "Total Cholesterol < 5.0 mmol/L (< 200 mg/dL) | Triglycerides < 1.7 mmol/L (< 150 mg/dL)",
    referralCriteria: "Total Cholesterol ≥ 6.2 mmol/L (≥ 240 mg/dL) or Triglycerides ≥ 5.6 mmol/L -> Physician/Lipid specialist.",
  },
  {
    type: "hba1c",
    title: "Point-of-Care HbA1c Check",
    category: "Glycemic POCT",
    description: "Measures 3-month average blood glucose percentage via fingerstick whole blood.",
    equipment: "NGSP-certified and IFCC-standardised point-of-care HbA1c analyser.",
    clinicalUtility: "Evaluates long-term glycemic control in known diabetic patients and screens for chronic hyperglycemia.",
    normalRange: "Normal: < 5.7% | Prediabetes: 5.7% – 6.4%",
    referralCriteria: "HbA1c ≥ 6.5% (Screening flag for diabetes) or > 9.0% in established diabetes -> Endocrinology/Physician.",
  },
  {
    type: "urinalysis",
    title: "Urine Dipstick Screening",
    category: "Renal & Metabolic POCT",
    description: "10-parameter rapid urine test strip (Protein, Glucose, Leukocytes, Nitrites, Blood, Ketones, pH).",
    equipment: "Standardised multi-parameter diagnostic reagent strips.",
    clinicalUtility: "Rapid screening for urinary tract infections (UTI), proteinuria (renal disease flag), and glucosuria.",
    normalRange: "Negative for Protein, Glucose, Leukocytes, Nitrites, Blood, Ketones.",
    referralCriteria: "Persistent 2+ Protein, Ketones + Glucose in diabetics, or macroscopic hematuria -> Laboratory / Clinic / Nephrology.",
  },
  {
    type: "pulse_oximetry",
    title: "Pulse Oximetry (SpO2)",
    category: "Respiratory Vitals",
    description: "Non-invasive measurement of peripheral arterial oxygen saturation and pulse waveform.",
    equipment: "Calibrated fingertip pulse oximeter.",
    clinicalUtility: "Screens for acute or chronic hypoxemia in asthma, COPD, pneumonia, and viral respiratory illness.",
    normalRange: "SpO2: 95% – 100% at sea level / ambient room air",
    referralCriteria: "SpO2 < 92% (or < 90% severe) -> Immediate oxygen therapy and Emergency / Hospital transfer.",
  },
  {
    type: "hiv_screening",
    title: "HIV Self-Test / Assisted Screening",
    category: "Infectious Disease POCT",
    description: "Oral fluid or fingerstick blood antibody test according to Kenya National HIV Testing Services (HTS) guidelines.",
    equipment: "Kenya MOH & WHO pre-qualified rapid HIV screening kits.",
    clinicalUtility: "Confidential screening and linkage to care/confirmation for positive results.",
    normalRange: "Non-Reactive",
    referralCriteria: "Any reactive screening result requires linkage to an accredited Comprehensive Care Centre (CCC) / Laboratory for confirmatory algorithm.",
  },
];

// ── Screening vs Diagnosis Clinical Principle ─────────────────

export const SCREENING_VS_DIAGNOSIS_PRINCIPLES = {
  coreDistinction:
    "Health screening is NOT the same thing as diagnosing a medical condition.",
  explanation:
    "A health screening performed at the pharmacy is a preliminary assessment designed to identify risk factors, catch early asymptomatic physiological deviations (e.g. high blood pressure, elevated blood sugar), and promote preventive wellness. A screening finding is not a definitive diagnosis and does not replace a comprehensive physician consultation, formal medical history, physical exam, or specialised diagnostic laboratory investigations.",
  keyTenets: [
    {
      title: "Preliminary Risk Identification",
      body: "Screenings identify out-of-range metrics (e.g. BP > 140/90, Glucose > 7.0 mmol/L) that indicate elevated risk and warrant medical attention.",
    },
    {
      title: "Non-Diagnostic Nature",
      body: "A screening flag requires definitive diagnostic workup and confirmation by a medical doctor, clinical officer, or specialist before a clinical diagnosis is made.",
    },
    {
      title: "Gatekeeper & Triage Role",
      body: "Community pharmacists serve as accessible frontline healthcare providers who guide patients toward healthy living or promptly refer them to the right healthcare level.",
    },
    {
      title: "Structured Referral System",
      body: "When abnormal findings or red flags arise, the pharmacy facilitates seamless referrals to Clinics, Hospitals, Laboratories, Specialists, or Emergency EMS.",
    },
  ],
};

// ── Kenyan Healthcare Referral Network ────────────────────────

export const KENYAN_REFERRAL_DESTINATIONS = {
  clinics: [
    { name: "Primary Care Outpatient Clinic", contact: "+254 20 2726300", area: "Local Community / Sub-County" },
    { name: "Family Health & Wellness Clinic", contact: "+254 700 112233", area: "Nairobi Metro" },
    { name: "Avenue Healthcare Outpatient Clinic", contact: "+254 711 060000", area: "Multiple Branches" },
  ],
  hospitals: [
    { name: "Kenyatta National Hospital (KNH)", type: "National Referral & Teaching", contact: "+254 20 2726300", area: "Upper Hill, Nairobi" },
    { name: "Kenyatta University Teaching, Referral & Research Hospital (KUTRRH)", type: "National Referral", contact: "+254 800 721038", area: "Northern Bypass, Nairobi" },
    { name: "Aga Khan University Hospital, Nairobi", type: "Tertiary Private", contact: "+254 20 3662000", area: "Parklands, Nairobi" },
    { name: "The Nairobi Hospital", type: "Tertiary Private", contact: "+254 703 082000", area: "Argwings Kodhek Rd, Nairobi" },
    { name: "MP Shah Hospital", type: "Tertiary Private", contact: "+254 20 4291000", area: "Shivachi Rd, Parklands" },
    { name: "The Mater Hospital", type: "Tertiary Private", contact: "+254 20 6903000", area: "South B, Nairobi" },
    { name: "Mbagathi County Referral Hospital", type: "County Public Referral", contact: "+254 20 2724712", area: "Mbagathi Way, Nairobi" },
    { name: "Mama Lucy Kibaki Hospital", type: "County Public Referral", contact: "+254 20 8022676", area: "Embakasi, Nairobi" },
    { name: "Kiambu County Referral Hospital", type: "County Public Referral", contact: "+254 66 2022022", area: "Kiambu" },
  ],
  laboratories: [
    { name: "Pathologists Lancet Kenya (Cerba Lancet)", type: "Diagnostic Pathology & Molecular", contact: "+254 703 061000", area: "Upper Hill & Countrywide" },
    { name: "PathCare Kenya", type: "Clinical Diagnostic Laboratory", contact: "+254 20 2715654", area: "Regal Plaza, Nairobi" },
    { name: "Mediheal Diagnostic & Laboratory Centre", type: "Advanced Diagnostics & Imaging", contact: "+254 722 207000", area: "Parklands, Nairobi" },
    { name: "National Public Health Laboratories (NPHL)", type: "Reference Laboratory", contact: "+254 20 2717077", area: "Kenyatta National Hospital grounds" },
  ],
  specialists: [
    { specialty: "Cardiology", name: "Cardiology & Hypertension Clinic", description: "Complex hypertension, arrhythmia, ECG/Echo, heart failure management." },
    { specialty: "Endocrinology & Diabetology", name: "Endocrine & Diabetes Centre", description: "Uncontrolled diabetes, insulin pump initiation, thyroid disorders, metabolic management." },
    { specialty: "Nephrology & Renal Care", name: "Renal Medicine & Hypertension", description: "Proteinuria, chronic kidney disease (CKD), electrolyte disorders." },
    { specialty: "Pulmonology & Respiratory", name: "Chest & Respiratory Clinic", description: "Chronic asthma, COPD, unexplained chronic cough, post-infectious pulmonary disease." },
    { specialty: "Clinical Dietetics & Nutrition", name: "Medical Nutrition Therapy", description: "Metabolic syndrome, therapeutic diet plans for diabetes, hypertension, and obesity." },
    { specialty: "Infectious Diseases / CCC", name: "Comprehensive Care Centre", description: "Confirmatory HIV testing, ART initiation, viral hepatitis management, resistant infections." },
  ],
  emergencyServices: [
    { name: "Kenya Red Cross Emergency EMS", number: "1199", tollFree: true, description: "24/7 National Emergency Ambulance & Paramedic Dispatch" },
    { name: "Kenya National Emergency Dispatch", number: "999 / 112", tollFree: true, description: "Police, Fire, and Medical Emergency Switchboard" },
    { name: "St John Ambulance Kenya", number: "+254 721 225285 / 0733 960000", tollFree: false, description: "Critical Care Ambulances and Emergency Medical Services" },
    { name: "AAR Emergency Rescue Services", number: "+254 725 225225 / 0734 225225", tollFree: false, description: "Emergency Evacuation & Road Ambulance" },
    { name: "AMREF Flying Doctors (Air & Ground)", number: "+254 20 6992299", tollFree: false, description: "Emergency Aeromedical and Critical Care Transport" },
  ],
};
