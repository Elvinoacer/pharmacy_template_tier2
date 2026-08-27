import "server-only";

import { prisma } from "@/app/lib/db";
import { normalizeForMatch } from "@/app/lib/services/medication-validation";

export type InteractionSeverity = "contraindicated" | "severe" | "moderate" | "minor";

export type DrugInteractionAlert = {
  severity: InteractionSeverity;
  drugA: string;
  drugB: string;
  description: string;
  clinicalEffect: string;
  management: string;
};

export type DuplicateTherapyAlert = {
  medicineName: string;
  genericName: string;
  existingRxId?: string;
  rxReference?: string | null;
  status: string;
  prescribedDate: string;
  dosage?: string | null;
  prescriber?: string | null;
  message: string;
};

export type DosageSafetyAlert = {
  severity: "flag" | "fail" | "pass";
  message: string;
  recommendedMaxDaily?: string;
  instructionsSummary: string;
  foodInstructions?: string;
  storageInstructions?: string;
  auxiliaryWarnings: string[];
};

export type PatientContraindicationAlert = {
  type: "pregnancy" | "pediatric" | "geriatric" | "condition";
  severity: "flag" | "fail";
  title: string;
  message: string;
};

export type GenericAlternativeItem = {
  id: string;
  medicationMasterId: string;
  name: string;
  genericName: string;
  brandName: string | null;
  strengthDisplay: string | null;
  dosageForm: string | null;
  price: number;
  stockQty: number;
  isGeneric: boolean;
  savingsKes: number;
  savingsPercent: number;
};

export type ControlledDrugAlert = {
  isControlled: boolean;
  schedule: string | null;
  requiresPrescription: boolean;
  requiresPrescriberLicense: boolean;
  requiresPatientId: boolean;
  notes: string;
};

export type ClinicalSafetyReport = {
  overallSafety: "safe" | "caution" | "warning" | "blocked";
  hasInteractions: boolean;
  hasDuplicates: boolean;
  hasContraindications: boolean;
  hasDosageWarnings: boolean;
  isControlledDrug: boolean;
  interactions: DrugInteractionAlert[];
  duplicates: DuplicateTherapyAlert[];
  dosageAlert: DosageSafetyAlert;
  contraindications: PatientContraindicationAlert[];
  controlledDrug: ControlledDrugAlert;
  genericAlternatives: GenericAlternativeItem[];
  medicationInfo?: {
    id: string;
    name: string;
    genericName: string;
    brandName?: string | null;
    strengthDisplay?: string | null;
    dosageForm?: string | null;
    route?: string | null;
    pregnancyCategory?: string | null;
    storage?: string | null;
    indications?: string | null;
    sideEffects?: string | null;
    contraindications?: string | null;
    requiresRefrigeration?: boolean;
  };
};

/**
 * Known high-risk clinical drug interaction rules (pharmacological classes & critical pairs).
 * Evaluated alongside relational `MedicationInteraction` table.
 */
const CRITICAL_INTERACTION_RULES: Array<{
  matchA: RegExp;
  matchB: RegExp;
  severity: InteractionSeverity;
  description: string;
  clinicalEffect: string;
  management: string;
}> = [
  {
    matchA: /\b(sildenafil|tadalafil|vardenafil)\b/i,
    matchB: /\b(nitroglycerin|isosorbide|nitroprusside|nitrate|glyceryl trinitrate)\b/i,
    severity: "contraindicated",
    description: "PDE-5 inhibitor + Nitrate combination",
    clinicalEffect: "Risk of profound, potentially life-threatening hypotension and cardiovascular collapse.",
    management: "Absolute contraindication. Do not co-prescribe or dispense concurrently.",
  },
  {
    matchA: /\b(warfarin|rivaroxaban|apixaban|dabigatran|heparin|enoxaparin)\b/i,
    matchB: /\b(ibuprofen|diclofenac|naproxen|ketoprofen|meloxicam|aspirin|indomethacin|piroxicam)\b/i,
    severity: "severe",
    description: "Anticoagulant + NSAID combination",
    clinicalEffect: "Significantly heightened risk of major gastrointestinal and systemic bleeding.",
    management: "Avoid combination. Use Paracetamol for analgesia or add a gastroprotective PPI if NSAID is essential under specialist supervision.",
  },
  {
    matchA: /\b(tramadol|pethidine|morphine|codeine|oxycodone|fentanyl)\b/i,
    matchB: /\b(diazepam|lorazepam|alprazolam|clonazepam|midazolam|bromazepam)\b/i,
    severity: "severe",
    description: "Opioid + Benzodiazepine combination",
    clinicalEffect: "Risk of profound sedation, respiratory depression, coma, and death.",
    management: "Avoid concomitant use. Limit dosages and durations to the minimum required. Counsel patient and caregivers on respiratory depression signs.",
  },
  {
    matchA: /\b(fluoxetine|sertraline|citalopram|escitalopram|paroxetine|venlafaxine)\b/i,
    matchB: /\b(tramadol|selegiline|rasagiline|linezolid|moclobemide|amitriptyline)\b/i,
    severity: "severe",
    description: "Serotonergic agent + Serotonergic/MAOI combination",
    clinicalEffect: "Risk of Serotonin Syndrome (hyperthermia, rigidity, autonomic instability, delirium).",
    management: "Avoid combination or closely monitor for signs of serotonin toxicity (tremors, hyperreflexia, agitation).",
  },
  {
    matchA: /\b(enalapril|lisinopril|ramipril|captopril|losartan|valsartan|candesartan|telmisartan)\b/i,
    matchB: /\b(spironolactone|eplerenone|potassium chloride|amiloride)\b/i,
    severity: "moderate",
    description: "ACE inhibitor / ARB + Potassium-sparing diuretic / Potassium supplement",
    clinicalEffect: "Risk of severe hyperkalemia leading to cardiac arrhythmias.",
    management: "Monitor serum potassium and renal function regularly. Counsel patient to avoid potassium-rich salt substitutes.",
  },
  {
    matchA: /\b(ciprofloxacin|levofloxacin|norfloxacin|doxycycline|tetracycline)\b/i,
    matchB: /\b(antacid|magnesium|aluminum|calcium|iron|ferrous|zinc)\b/i,
    severity: "moderate",
    description: "Fluoroquinolone / Tetracycline + Divalent/Trivalent Cations (Antacids/Iron/Calcium)",
    clinicalEffect: "Chelation reduces antibacterial bioavailability by up to 80%, leading to treatment failure.",
    management: "Separate administration by at least 2 hours before or 4 to 6 hours after cation-containing antacids or supplements.",
  },
  {
    matchA: /\b(atorvastatin|simvastatin|lovastatin)\b/i,
    matchB: /\b(clarithromycin|erythromycin|ketoconazole|itraconazole|fluconazole)\b/i,
    severity: "severe",
    description: "CYP3A4-metabolized Statin + Strong CYP3A4 Inhibitor",
    clinicalEffect: "Substantial increase in statin plasma levels; high risk of rhabdomyolysis and acute renal failure.",
    management: "Temporarily withhold statin during antibiotic/antifungal course or switch to Pravastatin/Rosuvastatin.",
  },
  {
    matchA: /\b(methotrexate)\b/i,
    matchB: /\b(ibuprofen|diclofenac|naproxen|meloxicam|indomethacin)\b/i,
    severity: "severe",
    description: "Methotrexate + NSAID combination",
    clinicalEffect: "NSAIDs reduce methotrexate renal clearance, leading to severe bone marrow suppression and hepatotoxicity.",
    management: "Avoid concomitant high-dose methotrexate. If low-dose methotrexate is used, monitor CBC and liver enzymes strictly.",
  },
  {
    matchA: /\b(metformin)\b/i,
    matchB: /\b(furosemide|contrast media|iodinated contrast)\b/i,
    severity: "moderate",
    description: "Metformin + Contrast/Diuretic",
    clinicalEffect: "Risk of acute renal impairment and lactic acidosis.",
    management: "Discontinue Metformin prior to or at time of iodinated contrast procedure and withhold for 48 hours until renal function is re-evaluated.",
  },
  {
    matchA: /\b(ibuprofen|diclofenac|naproxen|meloxicam|aspirin|indomethacin)\b/i,
    matchB: /\b(enalapril|lisinopril|ramipril|losartan|valsartan|telmisartan)\b/i,
    severity: "moderate",
    description: "NSAID + ACE Inhibitor / ARB (Triple Whammy component)",
    clinicalEffect: "NSAIDs blunt antihypertensive efficacy and reduce renal blood flow, increasing acute kidney injury risk.",
    management: "Monitor blood pressure and renal function. Keep NSAID duration as short as possible.",
  },
];

/** Standard auxiliary warning guidelines by pharmacological drug class */
function generateAuxiliaryWarnings(genericName: string, drugName: string): string[] {
  const warnings: string[] = [];
  const text = `${genericName} ${drugName}`.toLowerCase();

  if (/\b(amoxicillin|amoxil|ciprofloxacin|azithromycin|doxycycline|cephalexin|erythromycin|metronidazole|ceftriaxone|augmentin)\b/i.test(text)) {
    warnings.push("Complete the full prescribed course of this antibacterial medication even if you feel better.");
  }
  if (/\b(metronidazole|tinidazole)\b/i.test(text)) {
    warnings.push("Do not drink alcohol during treatment and for at least 48 hours after completing this medication.");
  }
  if (/\b(diazepam|lorazepam|alprazolam|tramadol|codeine|chlorpheniramine|promethazine|cetirizine|diphenhydramine)\b/i.test(text)) {
    warnings.push("May cause drowsiness. Do not drive or operate machinery if affected.");
  }
  if (/\b(ibuprofen|diclofenac|naproxen|aspirin|meloxicam|indomethacin|ketoprofen)\b/i.test(text)) {
    warnings.push("Take with or immediately after a meal to reduce stomach irritation.");
  }
  if (/\b(doxycycline|tetracycline|ciprofloxacin|levofloxacin)\b/i.test(text)) {
    warnings.push("Take with a full glass of water. Avoid excessive sunlight or UV exposure while taking this medicine.");
  }
  if (/\b(metformin)\b/i.test(text)) {
    warnings.push("Take with meals to minimise gastrointestinal side effects.");
  }
  if (/\b(atorvastatin|simvastatin|rosuvastatin)\b/i.test(text)) {
    warnings.push("Take in the evening or at bedtime. Report any unexplained muscle pain or weakness promptly.");
  }
  if (/\b(alendronate|risedronate|ibandronate)\b/i.test(text)) {
    warnings.push("Take first thing in the morning on an empty stomach with a full glass of plain water. Remain upright for at least 30 minutes.");
  }

  return warnings;
}

/** Standard food condition recommendation */
function deriveFoodCondition(genericName: string, drugName: string): string {
  const text = `${genericName} ${drugName}`.toLowerCase();
  if (/\b(ibuprofen|diclofenac|naproxen|meloxicam|aspirin|indomethacin|metformin|augmentin|griseofulvin|prednisone|prednisolone)\b/i.test(text)) {
    return "Take with or immediately after food / meals";
  }
  if (/\b(omeprazole|esomeprazole|pantoprazole|lansoprazole|alendronate|levothyroxine|ampicillin|cloxacillin)\b/i.test(text)) {
    return "Take on an empty stomach (30–60 minutes before meals)";
  }
  if (/\b(doxycycline|ciprofloxacin|azithromycin|paracetamol|amoxicillin|amlodipine|losartan|atorvastatin)\b/i.test(text)) {
    return "May be taken with or without food (with a full glass of water)";
  }
  return "Follow standard administration instructions with water";
}

/**
 * Screen medication dispensing and prescribing for clinical safety:
 * 1. Drug-Drug Interactions (relational + rule-based)
 * 2. Duplicate therapy detection
 * 3. Dosage and administration instructions verification
 * 4. Patient contraindications (Pregnancy, Pediatric, Geriatric)
 * 5. Controlled substance compliance requirements
 * 6. In-stock generic alternatives suggestions
 */
export async function screenClinicalSafety(input: {
  medicationId?: string | null;
  medicationMasterId?: string | null;
  customerId?: string | null;
  guestAge?: number | null;
  guestGender?: string | null;
  dosage?: string | null;
  schedule?: string | null;
  frequency?: string | null;
  quantity?: number | null;
  unitsPerDose?: number | null;
  concurrentMedicationIds?: string[];
}): Promise<ClinicalSafetyReport> {
  // Resolve the target medication
  let masterRow: any = null;
  let inventoryRow: any = null;

  if (input.medicationId) {
    inventoryRow = await prisma.pharmacyInventory.findUnique({
      where: { id: input.medicationId },
      include: {
        medicationMaster: {
          include: {
            dosageForm: true,
            route: true,
            pregnancyCategory: true,
            activeIngredients: { include: { activeIngredient: true } },
            interactionsA: { include: { interactsWith: true } },
            interactionsB: { include: { medicationMaster: true } },
          },
        },
      },
    });
    if (inventoryRow) {
      masterRow = inventoryRow.medicationMaster;
    }
  } else if (input.medicationMasterId) {
    masterRow = await prisma.medicationMaster.findUnique({
      where: { id: input.medicationMasterId },
      include: {
        dosageForm: true,
        route: true,
        pregnancyCategory: true,
        activeIngredients: { include: { activeIngredient: true } },
        interactionsA: { include: { interactsWith: true } },
        interactionsB: { include: { medicationMaster: true } },
      },
    });
  }

  const interactions: DrugInteractionAlert[] = [];
  const duplicates: DuplicateTherapyAlert[] = [];
  const contraindications: PatientContraindicationAlert[] = [];

  const targetGenericName = masterRow?.genericName || "";
  const targetName = masterRow?.name || "";
  const targetPregnancyCategory = masterRow?.pregnancyCategory?.value?.toUpperCase() || null;
  const isControlled = Boolean(masterRow?.controlledDrug);
  const controlledSchedule = masterRow?.controlledDrugSchedule || null;

  // Retrieve customer profile if provided
  let customerProfile: any = null;
  let activePrescriptions: any[] = [];
  let recentOrders: any[] = [];

  if (input.customerId) {
    customerProfile = await prisma.customerProfile.findUnique({
      where: { id: input.customerId },
      include: {
        prescriptions: {
          where: { status: "active" },
          include: {
            medication: {
              include: {
                medicationMaster: {
                  include: {
                    activeIngredients: { include: { activeIngredient: true } },
                  },
                },
              },
            },
          },
        },
        orders: {
          where: {
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            status: { in: ["paid", "fulfilled"] },
          },
          include: {
            items: {
              include: {
                medication: {
                  include: {
                    medicationMaster: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (customerProfile) {
      activePrescriptions = customerProfile.prescriptions || [];
      recentOrders = customerProfile.orders || [];
    }
  }

  // Gather all concurrent active drugs for this patient
  const concurrentDrugs: Array<{
    name: string;
    genericName: string;
    rxId?: string;
    rxRef?: string | null;
    dosage?: string | null;
    prescriber?: string | null;
    date: Date;
    activeIngredients: string[];
  }> = [];

  for (const rx of activePrescriptions) {
    const medMaster = rx.medication?.medicationMaster;
    const gen = medMaster?.genericName || rx.medicineName;
    const ings = (medMaster?.activeIngredients || []).map((ai: any) => ai.activeIngredient?.name || "").filter(Boolean);
    concurrentDrugs.push({
      name: rx.medicineName,
      genericName: gen,
      rxId: rx.id,
      rxRef: rx.rxReference,
      dosage: rx.dosage,
      prescriber: rx.prescriber,
      date: rx.createdAt,
      activeIngredients: ings.length > 0 ? ings : [gen],
    });
  }

  // Also include items from concurrentMedicationIds if passed explicitly
  if (input.concurrentMedicationIds && input.concurrentMedicationIds.length > 0) {
    const otherMeds = await prisma.pharmacyInventory.findMany({
      where: { id: { in: input.concurrentMedicationIds } },
      include: {
        medicationMaster: {
          include: { activeIngredients: { include: { activeIngredient: true } } },
        },
      },
    });
    for (const om of otherMeds) {
      const gen = om.medicationMaster?.genericName || om.medicationMaster?.name || "";
      const ings = (om.medicationMaster?.activeIngredients || []).map((ai: any) => ai.activeIngredient?.name || "").filter(Boolean);
      concurrentDrugs.push({
        name: om.medicationMaster?.name || "Concurrent Medication",
        genericName: gen,
        date: new Date(),
        activeIngredients: ings.length > 0 ? ings : [gen],
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Check Duplicate Therapy
  // ─────────────────────────────────────────────────────────────
  const normTargetGeneric = normalizeForMatch(targetGenericName);
  const normTargetName = normalizeForMatch(targetName);
  const targetIngredients = (masterRow?.activeIngredients || []).map(
    (ai: any) => normalizeForMatch(ai.activeIngredient?.name)
  ).filter(Boolean);

  for (const cd of concurrentDrugs) {
    // Avoid comparing a prescription to itself if editing
    if (cd.rxId && input.medicationId && cd.rxId === input.medicationId) continue;

    const normCdGeneric = normalizeForMatch(cd.genericName);
    const normCdName = normalizeForMatch(cd.name);
    const cdIngredients = (cd.activeIngredients || []).map(normalizeForMatch).filter(Boolean);

    let isDuplicate = false;
    let dupReason = "";

    if (normTargetGeneric && normCdGeneric && normTargetGeneric === normCdGeneric) {
      isDuplicate = true;
      dupReason = `Same active generic drug: "${cd.genericName}"`;
    } else if (normTargetName && normCdName && normTargetName === normCdName) {
      isDuplicate = true;
      dupReason = `Same medication name: "${cd.name}"`;
    } else {
      // Check ingredient intersection
      const sharedIng = targetIngredients.find((ti: string) => cdIngredients.includes(ti));
      if (sharedIng) {
        isDuplicate = true;
        dupReason = `Shares active ingredient: "${sharedIng}"`;
      }
    }

    if (isDuplicate) {
      duplicates.push({
        medicineName: cd.name,
        genericName: cd.genericName,
        existingRxId: cd.rxId,
        rxReference: cd.rxRef,
        status: "Active Prescription",
        prescribedDate: cd.date.toISOString().slice(0, 10),
        dosage: cd.dosage,
        prescriber: cd.prescriber,
        message: `Patient has active prescription for "${cd.name}" (${dupReason}). Dispensing another duplicate medicine risks accidental overdose or therapeutic duplication.`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Check Drug-Drug Interactions
  // ─────────────────────────────────────────────────────────────
  // A. Check relational MedicationInteraction table
  if (masterRow) {
    const tableInteractions = [
      ...(masterRow.interactionsA || []).map((i: any) => ({
        otherName: i.interactsWith?.name || i.interactsWith?.genericName || "",
        severity: (i.severity || "moderate") as InteractionSeverity,
        desc: i.description || "Drug interaction detected in pharmacy database.",
      })),
      ...(masterRow.interactionsB || []).map((i: any) => ({
        otherName: i.medicationMaster?.name || i.medicationMaster?.genericName || "",
        severity: (i.severity || "moderate") as InteractionSeverity,
        desc: i.description || "Drug interaction detected in pharmacy database.",
      })),
    ];

    for (const cd of concurrentDrugs) {
      const match = tableInteractions.find(
        (ti) =>
          normalizeForMatch(ti.otherName) === normalizeForMatch(cd.genericName) ||
          normalizeForMatch(ti.otherName) === normalizeForMatch(cd.name)
      );
      if (match) {
        interactions.push({
          severity: match.severity,
          drugA: targetName || targetGenericName,
          drugB: cd.name,
          description: match.desc,
          clinicalEffect: `Relational interaction: ${match.desc}`,
          management: "Consult clinical pharmacist or prescriber before concurrent administration.",
        });
      }
    }
  }

  // B. Check standard critical interaction rules
  for (const cd of concurrentDrugs) {
    const combinedA = `${targetGenericName} ${targetName}`;
    const combinedB = `${cd.genericName} ${cd.name}`;

    for (const rule of CRITICAL_INTERACTION_RULES) {
      const match1 = rule.matchA.test(combinedA) && rule.matchB.test(combinedB);
      const match2 = rule.matchB.test(combinedA) && rule.matchA.test(combinedB);

      if (match1 || match2) {
        // Avoid adding duplicate alert if already found
        if (!interactions.some((i) => i.drugB === cd.name && i.description === rule.description)) {
          interactions.push({
            severity: rule.severity,
            drugA: targetName || targetGenericName,
            drugB: cd.name,
            description: rule.description,
            clinicalEffect: rule.clinicalEffect,
            management: rule.management,
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Check Patient Contraindications & Demographics
  // ─────────────────────────────────────────────────────────────
  const dob = customerProfile?.dateOfBirth ? new Date(customerProfile.dateOfBirth) : null;
  const gender = customerProfile?.gender || input.guestGender || null;
  let age = input.guestAge ?? null;

  if (dob && !age) {
    const ageDiffMs = Date.now() - dob.getTime();
    age = Math.floor(ageDiffMs / (365.25 * 24 * 60 * 60 * 1000));
  }

  // Pregnancy Category Check
  if (targetPregnancyCategory) {
    const isFemale = gender === "female" || gender === "f";
    const isChildbearingAge = age != null ? age >= 12 && age <= 52 : true;
    const isPregnantTagged = (customerProfile?.tags || []).some((t: string) => /pregnan/i.test(t));

    if (targetPregnancyCategory === "X") {
      contraindications.push({
        type: "pregnancy",
        severity: "fail",
        title: "Pregnancy Category X — Contraindicated",
        message: `"${targetName}" is FDA Category X (proven fetal abnormalities and severe risk). It is strictly contraindicated in pregnancy or women attempting pregnancy.`,
      });
    } else if (targetPregnancyCategory === "D") {
      if (isPregnantTagged || (isFemale && isChildbearingAge)) {
        contraindications.push({
          type: "pregnancy",
          severity: isPregnantTagged ? "fail" : "flag",
          title: "Pregnancy Category D — Positive Evidence of Fetal Risk",
          message: `"${targetName}" is FDA Category D. Potential benefits may warrant use only in life-threatening situations where safer alternatives cannot be used. Verify pregnancy status.`,
        });
      }
    }
  }

  // Pediatric Checks (< 16 years)
  if (age != null && age < 16) {
    if (/\b(aspirin|acetylsalicylic)\b/i.test(`${targetGenericName} ${targetName}`)) {
      contraindications.push({
        type: "pediatric",
        severity: "fail",
        title: "Pediatric Contraindication — Reye's Syndrome Risk",
        message: `Aspirin is contraindicated in children and adolescents under 16 due to the risk of Reye's Syndrome (acute encephalopathy and fatty liver). Use Paracetamol or Ibuprofen instead.`,
      });
    }
    if (age < 8 && /\b(doxycycline|tetracycline|minocycline)\b/i.test(`${targetGenericName} ${targetName}`)) {
      contraindications.push({
        type: "pediatric",
        severity: "fail",
        title: "Pediatric Warning — Permanent Tooth Discoloration",
        message: `Tetracyclines should not be used in children under 8 years of age due to tooth enamel hypoplasia and permanent tooth staining.`,
      });
    }
    if (age < 18 && /\b(ciprofloxacin|levofloxacin|norfloxacin|ofloxacin)\b/i.test(`${targetGenericName} ${targetName}`)) {
      contraindications.push({
        type: "pediatric",
        severity: "flag",
        title: "Pediatric Caution — Fluoroquinolone Arthropathy Risk",
        message: `Fluoroquinolones carry caution in patients under 18 due to cartilage and tendon toxicity unless strictly indicated for specific pseudomonal/anthrax conditions.`,
      });
    }
  }

  // Geriatric Checks (> 65 years)
  if (age != null && age >= 65) {
    if (/\b(diazepam|flurazepam|chlordiazepoxide)\b/i.test(`${targetGenericName} ${targetName}`)) {
      contraindications.push({
        type: "geriatric",
        severity: "flag",
        title: "Geriatric Caution (Beers Criteria)",
        message: `Long-acting benzodiazepines have prolonged half-lives in older adults (≥65 yrs), substantially increasing falls, fracture risk, and cognitive impairment.`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Dosage & Administration Instruction Evaluation
  // ─────────────────────────────────────────────────────────────
  const dosageStr = input.dosage || masterRow?.dosage || "";
  const foodInstructions = deriveFoodCondition(targetGenericName, targetName);
  const storageInstructions = masterRow?.storage || (masterRow?.requiresRefrigeration ? "Store refrigerated at 2°C to 8°C. Do not freeze." : "Store below 25°C in a dry place away from direct sunlight.");
  const auxiliaryWarnings = generateAuxiliaryWarnings(targetGenericName, targetName);

  let dosageSeverity: "pass" | "flag" | "fail" = "pass";
  let dosageMsg = "Dosage instructions are complete and standard.";

  if (!dosageStr && !input.schedule) {
    dosageSeverity = "flag";
    dosageMsg = "No dosage or administration schedule provided. Pharmacist directions must be verified before dispensing.";
  } else if (input.unitsPerDose && input.unitsPerDose > 4) {
    dosageSeverity = "flag";
    dosageMsg = `High single dose quantity (${input.unitsPerDose} units per dose). Please verify against doctor's prescription.`;
  }

  const dosageAlert: DosageSafetyAlert = {
    severity: dosageSeverity,
    message: dosageMsg,
    instructionsSummary: dosageStr || input.schedule || "Take as directed by doctor or pharmacist.",
    foodInstructions,
    storageInstructions,
    auxiliaryWarnings,
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Controlled Drug Rules Check
  // ─────────────────────────────────────────────────────────────
  const controlledDrug: ControlledDrugAlert = {
    isControlled,
    schedule: controlledSchedule,
    requiresPrescription: isControlled,
    requiresPrescriberLicense: isControlled,
    requiresPatientId: isControlled,
    notes: isControlled
      ? `This is a controlled substance (${controlledSchedule?.toUpperCase().replace("_", " ") || "DDA Schedule"}). By law, it requires a valid written prescription, doctor's registration number, patient national ID, and mandatory entry into the Controlled Drugs Register.`
      : "Standard pharmaceutical item.",
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Look Up Generic Alternatives in Stock
  // ─────────────────────────────────────────────────────────────
  const genericAlternatives = await findGenericAlternativesForMedication(
    inventoryRow?.id || null,
    targetGenericName,
    inventoryRow?.price ? Number(inventoryRow.price) : 0,
    masterRow?.dosageFormId || null
  );

  // ─────────────────────────────────────────────────────────────
  // Determine Overall Safety Status
  // ─────────────────────────────────────────────────────────────
  let overallSafety: "safe" | "caution" | "warning" | "blocked" = "safe";

  const hasContraindicated = interactions.some((i) => i.severity === "contraindicated");
  const hasSevereInteraction = interactions.some((i) => i.severity === "severe");
  const hasFailedContraindication = contraindications.some((c) => c.severity === "fail");

  if (hasContraindicated || hasFailedContraindication) {
    overallSafety = "blocked";
  } else if (hasSevereInteraction || duplicates.length > 0) {
    overallSafety = "warning";
  } else if (interactions.length > 0 || contraindications.length > 0 || dosageSeverity === "flag") {
    overallSafety = "caution";
  }

  return {
    overallSafety,
    hasInteractions: interactions.length > 0,
    hasDuplicates: duplicates.length > 0,
    hasContraindications: contraindications.length > 0,
    hasDosageWarnings: dosageSeverity !== "pass",
    isControlledDrug: isControlled,
    interactions,
    duplicates,
    dosageAlert,
    contraindications,
    controlledDrug,
    genericAlternatives,
    medicationInfo: masterRow
      ? {
          id: masterRow.id,
          name: masterRow.name,
          genericName: masterRow.genericName,
          brandName: masterRow.brandName,
          strengthDisplay: masterRow.strengthDisplay,
          dosageForm: masterRow.dosageForm?.value || null,
          route: masterRow.route?.value || null,
          pregnancyCategory: masterRow.pregnancyCategory?.value || null,
          storage: storageInstructions,
          indications: masterRow.indications,
          sideEffects: masterRow.sideEffects,
          contraindications: masterRow.contraindications,
          requiresRefrigeration: masterRow.requiresRefrigeration,
        }
      : undefined,
  };
}

/**
 * Finds in-stock generic equivalents and bioequivalent alternatives
 * for a medication with cost savings calculation.
 */
async function findGenericAlternativesForMedication(
  currentInventoryId: string | null,
  genericName: string,
  currentPrice: number,
  dosageFormId?: string | null
): Promise<GenericAlternativeItem[]> {
  if (!genericName || !genericName.trim()) return [];

  try {
    const candidates = await prisma.pharmacyInventory.findMany({
      where: {
        active: true,
        currentStock: { gt: 0 },
        ...(currentInventoryId ? { id: { not: currentInventoryId } } : {}),
        medicationMaster: {
          genericName: { equals: genericName.trim(), mode: "insensitive" },
          ...(dosageFormId ? { dosageFormId } : {}),
        },
      },
      include: {
        medicationMaster: {
          include: { dosageForm: true },
        },
      },
      take: 6,
      orderBy: { price: "asc" },
    });

    return candidates.map((c) => {
      const price = Number(c.price);
      const savingsKes = Math.max(0, currentPrice - price);
      const savingsPercent = currentPrice > 0 && savingsKes > 0
        ? Math.round((savingsKes / currentPrice) * 100)
        : 0;

      const isGeneric =
        !c.medicationMaster.brandName ||
        normalizeForMatch(c.medicationMaster.name) === normalizeForMatch(c.medicationMaster.genericName);

      return {
        id: c.id,
        medicationMasterId: c.medicationMasterId,
        name: c.medicationMaster.name,
        genericName: c.medicationMaster.genericName,
        brandName: c.medicationMaster.brandName,
        strengthDisplay: c.medicationMaster.strengthDisplay,
        dosageForm: c.medicationMaster.dosageForm?.value || null,
        price,
        stockQty: c.currentStock,
        isGeneric,
        savingsKes,
        savingsPercent,
      };
    });
  } catch (err) {
    console.error("[findGenericAlternativesForMedication] Error:", err);
    return [];
  }
}
