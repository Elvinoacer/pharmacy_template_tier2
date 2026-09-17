import "server-only";

import { prisma } from "@/app/lib/db";
import { addTimelineEvent, writeAuditLog } from "@/app/lib/auth";
import { formatMpesaPhone } from "@/app/lib/services/daraja";
import { getTenant } from "@/app/lib/tenant";
import {
  CONSENT_TEXT,
  DEFAULT_IMMUNIZATION_POLICY,
  VACCINE_CATALOG,
  PRE_VACCINATION_QUESTIONS,
  evaluatePreVaccinationScreening,
  type ScreeningAnswers,
} from "@/app/lib/vaccination-catalog";

function certificateCode(): string {
  const y = new Date().toISOString().slice(0, 7).replace("-", "");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `IMU-${y}-${rand}`;
}

export async function ensureVaccineCatalog() {
  const count = await prisma.vaccineProduct.count().catch(() => 0);
  if (count > 0) return;
  for (const v of VACCINE_CATALOG) {
    await prisma.vaccineProduct.create({
      data: {
        slug: v.slug,
        name: v.name,
        antigen: v.antigen,
        brandName: v.brandName,
        manufacturer: v.manufacturer,
        category: v.category,
        diseasesPrevented: v.diseasesPrevented,
        description: v.description,
        indications: v.indications,
        whoShouldGet: v.whoShouldGet,
        whoShouldWait: v.whoShouldWait,
        contraindications: v.contraindications,
        precautions: v.precautions,
        commonSideEffects: v.commonSideEffects,
        rareRisks: v.rareRisks,
        route: v.route,
        siteOptions: v.siteOptions,
        doseMl: v.doseMl,
        seriesDoses: v.seriesDoses,
        seriesIntervalDays: v.seriesIntervalDays,
        boosterIntervalMonths: v.boosterIntervalMonths,
        minAgeMonths: v.minAgeMonths,
        maxAgeMonths: v.maxAgeMonths,
        visTitle: v.visTitle,
        visVersion: v.visVersion,
        visSummary: v.visSummary,
        storageRequirements: v.storageRequirements,
        priceKes: v.priceKes,
        pharmacyAdministered: v.pharmacyAdministered,
        bookable: v.pharmacyAdministered,
        travelRelated: v.travelRelated,
        seasonLabel: v.seasonLabel,
        regulatoryNotes: v.regulatoryNotes,
        sortOrder: v.sortOrder,
        active: true,
      },
    });
  }
}

export async function getImmunizationPolicy() {
  const tenant = await getTenant();
  const pharmacyId = tenant.pharmacyId;
  if (!pharmacyId) {
    return {
      id: "none",
      pharmacyId: "",
      ...DEFAULT_IMMUNIZATION_POLICY,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  const row = await prisma.pharmacyImmunizationPolicy
    .findUnique({ where: { pharmacyId } })
    .catch(() => null);
  if (row) return row;
  return prisma.pharmacyImmunizationPolicy.upsert({
    where: { pharmacyId },
    create: {
      pharmacyId,
      ...DEFAULT_IMMUNIZATION_POLICY,
    },
    update: {},
  });
}

export async function listPublicVaccines() {
  await ensureVaccineCatalog().catch(() => {});
  return prisma.vaccineProduct.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getPublicVaccineBySlug(slug: string) {
  await ensureVaccineCatalog().catch(() => {});
  return prisma.vaccineProduct.findFirst({
    where: { slug, active: true },
  });
}

export async function listPublicHealthCampaigns(opts?: { activeOnly?: boolean }) {
  return prisma.publicHealthCampaign.findMany({
    where: opts?.activeOnly === false ? undefined : { active: true },
    orderBy: { startDate: "desc" },
  });
}

export async function listCounsellingSessionsAdmin(opts?: { take?: number }) {
  return prisma.preventiveCounsellingSession.findMany({
    orderBy: { createdAt: "desc" },
    take: opts?.take ?? 100,
    include: {
      customer: { select: { id: true, fullName: true, phone: true } },
      counsellor: { select: { id: true, email: true, role: true } },
    },
  });
}

export type BookVaccinationInput = {
  vaccineSlug: string;
  fullName: string;
  phone: string;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  notes?: string | null;
  source?: string;
  customerId?: string | null;
  campaignSlug?: string | null;
  answers: ScreeningAnswers;
  consentType: string;
  consenterName: string;
  consenterRelationship?: string | null;
  signatureName: string;
  pharmacyId?: string;
};

export async function bookVaccination(input: BookVaccinationInput) {
  const vaccine = await prisma.vaccineProduct.findFirst({
    where: { slug: input.vaccineSlug, active: true },
  });
  if (!vaccine) throw new Error("That vaccine is not available.");
  if (!vaccine.bookable || !vaccine.pharmacyAdministered) {
    throw new Error(
      "This antigen is information-only at the pharmacy. We can counsel and refer you to an authorised centre.",
    );
  }

  const fullName = input.fullName.trim();
  const phoneRaw = input.phone.trim();
  if (fullName.length < 2) throw new Error("Your name is required.");
  if (phoneRaw.replace(/\D/g, "").length < 9) {
    throw new Error("A valid phone number is required.");
  }
  if (!input.signatureName.trim()) {
    throw new Error("Please type your name to sign the consent.");
  }

  for (const q of PRE_VACCINATION_QUESTIONS) {
    if (!input.answers?.[q.id] || !["yes", "no", "unsure"].includes(input.answers[q.id])) {
      throw new Error(`Screening question "${q.prompt}" must be answered.`);
    }
  }

  if (input.dateOfBirth) {
    const dob = new Date(input.dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      throw new Error("Enter a valid date of birth.");
    }
    const today = new Date();
    const ageInMonths =
      (today.getFullYear() - dob.getFullYear()) * 12 +
      (today.getMonth() - dob.getMonth());
    if (vaccine.minAgeMonths != null && ageInMonths < vaccine.minAgeMonths) {
      const minYears = Math.floor(vaccine.minAgeMonths / 12);
      throw new Error(
        `Patient does not meet the minimum age requirement (${minYears > 0 ? `${minYears} years` : `${vaccine.minAgeMonths} months`}) for this vaccine.`,
      );
    }
    if (vaccine.maxAgeMonths != null && ageInMonths > vaccine.maxAgeMonths) {
      throw new Error("Patient exceeds the maximum recommended age for this vaccine.");
    }
  }

  if (input.preferredDate) {
    const pref = new Date(`${input.preferredDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(pref.getTime()) || pref < today) {
      throw new Error("Preferred appointment date must be today or a future date.");
    }
  }

  const evaluation = evaluatePreVaccinationScreening(input.answers || {});
  const phone = formatMpesaPhone(phoneRaw);

  let campaignId: string | null = null;
  if (input.campaignSlug) {
    const camp = await prisma.publicHealthCampaign.findFirst({
      where: { slug: input.campaignSlug, active: true },
      select: { id: true },
    });
    campaignId = camp?.id ?? null;
  }

  const status =
    evaluation.outcome === "eligible"
      ? "requested"
      : evaluation.outcome === "defer"
        ? "deferred"
        : evaluation.outcome === "contraindicated"
          ? "cancelled"
          : "referred";

  const tenant = await getTenant().catch(() => ({ pharmacyId: null }));
  const pharmacyId = input.pharmacyId || tenant.pharmacyId;
  if (!pharmacyId) {
    throw new Error("A valid pharmacy is required to book a vaccination appointment.");
  }

  const appointment = await prisma.immunizationAppointment.create({
    data: {
      pharmacyId,
      vaccineProductId: vaccine.id,
      customerId: input.customerId || null,
      campaignId,
      patientName: fullName,
      patientPhone: phone,
      patientEmail: input.email?.trim().toLowerCase() || null,
      patientDob: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      patientGender: input.gender || null,
      preferredDate: input.preferredDate || null,
      preferredTime: input.preferredTime || null,
      status,
      source: input.source || "online",
      notes: input.notes?.trim() || null,
      screening: {
        create: {
          customerId: input.customerId || null,
          answers: input.answers as object,
          allergyFlag: evaluation.flags.allergyFlag,
          pregnancyFlag: evaluation.flags.pregnancyFlag,
          immunocompromisedFlag: evaluation.flags.immunocompromisedFlag,
          recentIllnessFlag: evaluation.flags.recentIllnessFlag,
          previousReactionFlag: evaluation.flags.previousReactionFlag,
          anticoagulantFlag: evaluation.flags.anticoagulantFlag,
          outcome: evaluation.outcome,
          outcomeReason: evaluation.reason,
        },
      },
      consent: {
        create: {
          vaccineProductId: vaccine.id,
          customerId: input.customerId || null,
          visProvided: true,
          visVersion: vaccine.visVersion,
          visProvidedAt: new Date(),
          consentType: input.consentType || "self",
          consenterName: input.consenterName.trim(),
          consenterRelationship: input.consenterRelationship?.trim() || null,
          signatureName: input.signatureName.trim(),
          consentTextSnapshot: CONSENT_TEXT,
        },
      },
    },
    include: {
      vaccine: true,
      screening: true,
      consent: true,
    },
  });

  if (input.customerId) {
    await addTimelineEvent(
      input.customerId,
      null,
      "vaccination_booking",
      `Vaccination request: ${vaccine.name}`,
      `Status ${status}. Screening: ${evaluation.outcome}. ${evaluation.reason}`,
      { appointmentId: appointment.id, vaccineSlug: vaccine.slug, outcome: evaluation.outcome },
    ).catch(() => {});
  }

  return { appointment, evaluation, vaccine };
}

export async function listAdminAppointments(opts?: { take?: number; status?: string }) {
  return prisma.immunizationAppointment.findMany({
    where:
      opts?.status && opts.status !== "all" ? { status: opts.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: opts?.take ?? 150,
    include: {
      vaccine: { select: { id: true, slug: true, name: true, antigen: true, priceKes: true, route: true, siteOptions: true, doseMl: true, visVersion: true } },
      customer: { select: { id: true, fullName: true, phone: true } },
      assignedTo: { select: { id: true, email: true } },
      screening: true,
      consent: true,
      record: { select: { id: true, certificateCode: true, administeredAt: true, status: true } },
    },
  });
}

export async function updateAppointmentStatus(
  id: string,
  status: string,
  staffNotes?: string | null,
  assignedToId?: string | null,
) {
  return prisma.immunizationAppointment.update({
    where: { id },
    data: {
      status,
      ...(staffNotes !== undefined ? { staffNotes: staffNotes?.trim() || null } : {}),
      ...(assignedToId !== undefined ? { assignedToId } : {}),
    },
  });
}

export type AdministerInput = {
  appointmentId?: string | null;
  vaccineProductId: string;
  customerId?: string | null;
  administeredById: string;
  supervisingPharmacistId?: string | null;
  patientName: string;
  patientDob?: string | null;
  patientGender?: string | null;
  patientPhone?: string | null;
  doseNumber?: number;
  route: string;
  site: string;
  doseMl?: number | null;
  lotNumber: string;
  expiryDate?: string | null;
  manufacturer?: string | null;
  visVersion?: string | null;
  observationMinutes?: number;
  notes?: string | null;
  campaignId?: string | null;
};

export async function administerVaccination(input: AdministerInput) {
  const lot = input.lotNumber.trim();
  if (!lot) throw new Error("Lot / batch number is required.");
  if (!input.site.trim()) throw new Error("Injection site is required.");
  if (!input.patientName.trim()) throw new Error("Patient name is required.");

  const vaccine = await prisma.vaccineProduct.findUnique({
    where: { id: input.vaccineProductId },
  });
  if (!vaccine) throw new Error("Vaccine product not found.");

  const policy = await getImmunizationPolicy();
  const observationMinutes =
    input.observationMinutes ?? policy.observationMinutesDefault ?? 15;

  const now = new Date();
  const observationUntil = new Date(now.getTime() + observationMinutes * 60_000);

  let nextDueDate: Date | null = null;
  const doseNumber = input.doseNumber ?? 1;
  const seriesComplete = doseNumber >= (vaccine.seriesDoses || 1);
  if (!seriesComplete && vaccine.seriesIntervalDays) {
    nextDueDate = new Date(now.getTime() + vaccine.seriesIntervalDays * 86400000);
  } else if (seriesComplete && vaccine.boosterIntervalMonths) {
    nextDueDate = new Date(now);
    nextDueDate.setMonth(nextDueDate.getMonth() + vaccine.boosterIntervalMonths);
  }

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.immunizationRecord.create({
      data: {
        appointmentId: input.appointmentId || null,
        vaccineProductId: vaccine.id,
        customerId: input.customerId || null,
        administeredById: input.administeredById,
        supervisingPharmacistId: input.supervisingPharmacistId || null,
        patientName: input.patientName.trim(),
        patientDob: input.patientDob ? new Date(input.patientDob) : null,
        patientGender: input.patientGender || null,
        patientPhone: input.patientPhone || null,
        doseNumber,
        seriesComplete,
        administeredAt: now,
        route: input.route || vaccine.route,
        site: input.site.trim(),
        doseMl: input.doseMl ?? (vaccine.doseMl != null ? Number(vaccine.doseMl) : null),
        lotNumber: lot,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        manufacturer: input.manufacturer || vaccine.manufacturer,
        visGivenAt: now,
        visVersion: input.visVersion || vaccine.visVersion,
        observationMinutes,
        observationUntil,
        observationOutcome: "uneventful",
        nextDueDate,
        certificateCode: certificateCode(),
        campaignId: input.campaignId || null,
        notes: input.notes?.trim() || null,
        status: "administered",
      },
      include: {
        vaccine: true,
        administeredBy: { select: { id: true, email: true, role: true } },
      },
    });

    if (input.appointmentId) {
      await tx.immunizationAppointment.update({
        where: { id: input.appointmentId },
        data: { status: "administered" },
      });
    }

    if (input.campaignId) {
      await tx.publicHealthCampaign
        .update({
          where: { id: input.campaignId },
          data: { dosesAdministered: { increment: 1 } },
        })
        .catch(() => {});
    }

    return created;
  });

  if (input.customerId) {
    await addTimelineEvent(
      input.customerId,
      input.administeredById,
      "vaccination_administered",
      `Vaccinated: ${vaccine.name} (dose ${doseNumber})`,
      `Lot ${lot}. Certificate ${record.certificateCode}. Observation ${observationMinutes} min.${nextDueDate ? ` Next due ${nextDueDate.toISOString().slice(0, 10)}.` : ""}`,
      { recordId: record.id, certificateCode: record.certificateCode, vaccineSlug: vaccine.slug },
      input.administeredById,
    ).catch(() => {});
  }

  await writeAuditLog(
    input.administeredById,
    "immunization_administered",
    "immunization_record",
    record.id,
    { vaccine: vaccine.slug, lot, certificateCode: record.certificateCode },
  ).catch(() => {});

  return record;
}

export async function completeObservation(recordId: string, outcome: string, actorId?: string) {
  const record = await prisma.immunizationRecord.update({
    where: { id: recordId },
    data: { observationOutcome: outcome },
  });
  if (record.appointmentId && outcome === "uneventful") {
    await prisma.immunizationAppointment.update({
      where: { id: record.appointmentId },
      data: { status: "completed" },
    });
  }
  if (actorId) {
    await writeAuditLog(actorId, "immunization_observation", "immunization_record", recordId, {
      outcome,
    }).catch(() => {});
  }
  return record;
}

export async function listImmunizationRecords(opts?: {
  customerId?: string;
  take?: number;
}) {
  return prisma.immunizationRecord.findMany({
    where: opts?.customerId ? { customerId: opts.customerId, status: "administered" } : { status: "administered" },
    orderBy: { administeredAt: "desc" },
    take: opts?.take ?? 150,
    include: {
      vaccine: { select: { slug: true, name: true, antigen: true, category: true } },
      administeredBy: { select: { id: true, email: true, role: true } },
      supervisingPharmacist: { select: { id: true, email: true } },
      customer: { select: { id: true, fullName: true, phone: true } },
      aefiReports: true,
    },
  });
}

export async function getImmunizationByCertificate(code: string) {
  return prisma.immunizationRecord.findUnique({
    where: { certificateCode: code.trim().toUpperCase() },
    include: {
      vaccine: true,
      administeredBy: { select: { email: true, role: true } },
      supervisingPharmacist: { select: { email: true, role: true } },
    },
  });
}

export type AefiInput = {
  immunizationId: string;
  onsetAt: string;
  severity: string;
  symptoms: string;
  actionTaken: string;
  outcome?: string;
  reportedToAuthority?: boolean;
  reportedById?: string | null;
  notes?: string | null;
};

export async function recordAefi(input: AefiInput) {
  const report = await prisma.adverseEventFollowingImmunization.create({
    data: {
      immunizationId: input.immunizationId,
      onsetAt: new Date(input.onsetAt),
      severity: input.severity,
      symptoms: input.symptoms.trim(),
      actionTaken: input.actionTaken.trim(),
      outcome: input.outcome || "recovering",
      reportedToAuthority: Boolean(input.reportedToAuthority),
      reportedAt: input.reportedToAuthority ? new Date() : null,
      reportedById: input.reportedById || null,
      notes: input.notes?.trim() || null,
    },
    include: {
      immunization: {
        include: { vaccine: true, customer: { select: { id: true, fullName: true } } },
      },
    },
  });

  await prisma.immunizationRecord.update({
    where: { id: input.immunizationId },
    data: { observationOutcome: "aefi" },
  });

  if (report.immunization.customerId) {
    await addTimelineEvent(
      report.immunization.customerId,
      input.reportedById || null,
      "vaccination_aefi",
      `AEFI recorded (${input.severity}) after ${report.immunization.vaccine.name}`,
      input.symptoms,
      { aefiId: report.id, immunizationId: input.immunizationId },
      input.reportedById || undefined,
    ).catch(() => {});
  }

  return report;
}

export async function listAefiReports(take = 80) {
  return prisma.adverseEventFollowingImmunization.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: {
      immunization: {
        include: {
          vaccine: { select: { name: true, slug: true } },
          customer: { select: { fullName: true } },
        },
      },
      reportedBy: { select: { email: true } },
    },
  });
}

export type CounsellingInput = {
  pharmacyId?: string | null;
  customerId?: string | null;
  counsellorId?: string | null;
  topic: string;
  format?: string;
  durationMinutes?: number;
  patientName: string;
  patientPhone?: string | null;
  summary?: string | null;
  goals?: string[];
  resourcesGiven?: string[];
  followUpDate?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  status?: string;
  source?: string;
};

export async function createCounsellingSession(input: CounsellingInput) {
  const tenant = await getTenant().catch(() => ({ pharmacyId: null }));
  const pharmacyId = input.pharmacyId || tenant.pharmacyId;
  if (!pharmacyId) {
    throw new Error("A valid pharmacy is required for preventive counselling appointments.");
  }

  const session = await prisma.preventiveCounsellingSession.create({
    data: {
      pharmacyId,
      customerId: input.customerId || null,
      counsellorId: input.counsellorId || null,
      topic: input.topic,
      format: input.format || "in_person",
      durationMinutes: input.durationMinutes ?? 20,
      patientName: input.patientName.trim(),
      patientPhone: input.patientPhone?.trim() || null,
      summary: input.summary?.trim() || null,
      goals: input.goals || [],
      resourcesGiven: input.resourcesGiven || [],
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
      preferredDate: input.preferredDate || null,
      preferredTime: input.preferredTime || null,
      status: input.status || "scheduled",
      source: input.source || "online",
    },
  });

  if (input.customerId) {
    await addTimelineEvent(
      input.customerId,
      input.counsellorId || null,
      "preventive_counselling",
      `Preventive counselling: ${input.topic.replace(/_/g, " ")}`,
      input.summary || `Session ${session.status}`,
      { sessionId: session.id, topic: input.topic },
      input.counsellorId || undefined,
    ).catch(() => {});
  }
  return session;
}

export async function updateCounsellingSession(
  id: string,
  data: Partial<CounsellingInput> & { status?: string; summary?: string | null },
) {
  return prisma.preventiveCounsellingSession.update({
    where: { id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
      ...(data.followUpDate !== undefined
        ? { followUpDate: data.followUpDate ? new Date(data.followUpDate) : null }
        : {}),
      ...(data.goals ? { goals: data.goals } : {}),
      ...(data.resourcesGiven ? { resourcesGiven: data.resourcesGiven } : {}),
    },
  });
}

export async function listCustomerVaccinationPortal(customerId: string) {
  const [appointments, records, counselling] = await Promise.all([
    prisma.immunizationAppointment.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { vaccine: true, screening: true, record: true },
    }),
    prisma.immunizationRecord.findMany({
      where: { customerId, status: "administered" },
      orderBy: { administeredAt: "desc" },
      include: { vaccine: true, aefiReports: true },
    }),
    prisma.preventiveCounsellingSession.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { counsellor: { select: { email: true, role: true } } },
    }),
  ]);
  return { appointments, records, counselling };
}

export async function listImmunizerCredentials() {
  return prisma.immunizerCredential.findMany({
    orderBy: { expiresAt: "asc" },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
}

export async function upsertImmunizerCredential(input: {
  userId: string;
  credentialType: string;
  title: string;
  licenseNumber?: string | null;
  issuedBy: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
}) {
  return prisma.immunizerCredential.create({
    data: {
      userId: input.userId,
      credentialType: input.credentialType,
      title: input.title.trim(),
      licenseNumber: input.licenseNumber?.trim() || null,
      issuedBy: input.issuedBy.trim(),
      issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      notes: input.notes?.trim() || null,
      verified: true,
    },
  });
}

export async function updateImmunizationPolicy(
  data: Partial<{
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
  }> & { updatedById?: string },
) {
  const tenant = await getTenant();
  const pharmacyId = tenant.pharmacyId;
  if (!pharmacyId) throw new Error("No active pharmacy");
  return prisma.pharmacyImmunizationPolicy.upsert({
    where: { pharmacyId },
    create: {
      pharmacyId,
      ...DEFAULT_IMMUNIZATION_POLICY,
      ...data,
      updatedById: data.updatedById,
    },
    update: {
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      ...(data.jurisdiction ? { jurisdiction: data.jurisdiction } : {}),
      ...(data.authorizingBody ? { authorizingBody: data.authorizingBody } : {}),
      ...(data.authorizingRegulation !== undefined
        ? { authorizingRegulation: data.authorizingRegulation }
        : {}),
      ...(data.supervisingPharmacistRequired !== undefined
        ? { supervisingPharmacistRequired: data.supervisingPharmacistRequired }
        : {}),
      ...(data.observationMinutesDefault !== undefined
        ? { observationMinutesDefault: data.observationMinutesDefault }
        : {}),
      ...(data.visRequired !== undefined ? { visRequired: data.visRequired } : {}),
      ...(data.walkInAccepted !== undefined ? { walkInAccepted: data.walkInAccepted } : {}),
      ...(data.paediatricOnSite !== undefined ? { paediatricOnSite: data.paediatricOnSite } : {}),
      ...(data.publicDisclaimer !== undefined ? { publicDisclaimer: data.publicDisclaimer } : {}),
      ...(data.coldChainNotes !== undefined ? { coldChainNotes: data.coldChainNotes } : {}),
      ...(data.aefiReportingContact !== undefined
        ? { aefiReportingContact: data.aefiReportingContact }
        : {}),
      updatedById: data.updatedById,
    },
  });
}

export async function createPublicHealthCampaign(input: {
  slug: string;
  title: string;
  theme: string;
  description: string;
  short: string;
  startDate: string;
  endDate?: string | null;
  targetPopulation: string;
  vaccinesOffered?: string[];
  walkInDays?: string | null;
  targetDoses?: number | null;
  educationTopics?: string[];
  locationNotes?: string | null;
  regulatoryNotes?: string | null;
  heroImage?: string | null;
  crmCampaignId?: string | null;
}) {
  return prisma.publicHealthCampaign.create({
    data: {
      slug: input.slug,
      title: input.title,
      theme: input.theme,
      description: input.description,
      short: input.short,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      targetPopulation: input.targetPopulation,
      vaccinesOffered: input.vaccinesOffered || [],
      walkInDays: input.walkInDays || null,
      targetDoses: input.targetDoses ?? null,
      educationTopics: input.educationTopics || [],
      locationNotes: input.locationNotes || null,
      regulatoryNotes: input.regulatoryNotes || null,
      heroImage: input.heroImage || null,
      campaignId: input.crmCampaignId || null,
      active: true,
    },
  });
}
