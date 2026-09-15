import path from "node:path";
import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConfig } from "../app/lib/db/config";
import { createRlsPool } from "../app/lib/db/rls";
import { withPlatformBypass } from "../app/lib/tenant-context";
import { VACCINE_CATALOG, DEFAULT_IMMUNIZATION_POLICY } from "../app/lib/vaccination-catalog";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seeding");
}

const adapter = new PrismaPg(createRlsPool(buildPostgresConfig(connectionString)));
const prisma = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("Seeding Tier 2 Customer Engagement Platform…");

  try {
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
    `;
    const tables = tablenames.map(({ tablename }) => `"${tablename}"`).join(", ");
    if (tables.length > 0) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  } catch {
    // Fallback child-first deletion if TRUNCATE is restricted
    await prisma.adverseEventFollowingImmunization.deleteMany().catch(() => {});
    await prisma.immunizationRecord.deleteMany().catch(() => {});
    await prisma.vaccinationConsent.deleteMany().catch(() => {});
    await prisma.preVaccinationScreening.deleteMany().catch(() => {});
    await prisma.immunizationAppointment.deleteMany().catch(() => {});
    await prisma.preventiveCounsellingSession.deleteMany().catch(() => {});
    await prisma.immunizerCredential.deleteMany().catch(() => {});
    await prisma.publicHealthCampaign.deleteMany().catch(() => {});
    await prisma.vaccineProduct.deleteMany().catch(() => {});
    await prisma.pharmacyImmunizationPolicy.deleteMany().catch(() => {});
    await prisma.stockMovement.deleteMany().catch(() => {});
    await prisma.inventoryLot.deleteMany().catch(() => {});
    await prisma.pharmacyInventory.deleteMany().catch(() => {});
    await prisma.medicationClinicalTag.deleteMany().catch(() => {});
    await prisma.medicationActiveIngredient.deleteMany().catch(() => {});
    await prisma.medicationInteraction.deleteMany().catch(() => {});
    await prisma.medicationPriceHistory.deleteMany().catch(() => {});
    await prisma.medicationMaster.deleteMany().catch(() => {});
    await prisma.medicationCategory.deleteMany().catch(() => {});
    await prisma.cashierSession.deleteMany().catch(() => {});
    await prisma.commerceEvent.deleteMany().catch(() => {});
    await prisma.inventoryAllocation.deleteMany().catch(() => {});
    await prisma.inventoryReservation.deleteMany().catch(() => {});
    await prisma.refund.deleteMany().catch(() => {});
    await prisma.payment.deleteMany().catch(() => {});
    await prisma.orderItem.deleteMany().catch(() => {});
    await prisma.order.deleteMany().catch(() => {});
    await prisma.prescriptionFill.deleteMany().catch(() => {});
    await prisma.doseLog.deleteMany().catch(() => {});
    await prisma.adherenceEscalation.deleteMany().catch(() => {});
    await prisma.adherenceFollowUp.deleteMany().catch(() => {});
    await prisma.refillSyncEnrollment.deleteMany().catch(() => {});
    await prisma.medicationSchedule.deleteMany().catch(() => {});
    await prisma.prescriptionClarificationLog.deleteMany().catch(() => {});
    await prisma.prescriptionAdherence.deleteMany().catch(() => {});
    await prisma.refillRequest.deleteMany().catch(() => {});
    await prisma.prescription.deleteMany().catch(() => {});
    await prisma.symptomCheckIn.deleteMany().catch(() => {});
    await prisma.symptomMessage.deleteMany().catch(() => {});
    await prisma.symptomSession.deleteMany().catch(() => {});
    await prisma.serviceBooking.deleteMany().catch(() => {});
    await prisma.pharmacyService.deleteMany().catch(() => {});
    await prisma.caregiverInvite.deleteMany().catch(() => {});
    await prisma.caregiver.deleteMany().catch(() => {});
    await prisma.customerPreference.deleteMany().catch(() => {});
    await prisma.customerSegment.deleteMany().catch(() => {});
    await prisma.campaign.deleteMany().catch(() => {});
    await prisma.segment.deleteMany().catch(() => {});
    await prisma.reminder.deleteMany().catch(() => {});
    await prisma.notification.deleteMany().catch(() => {});
    await prisma.adminNotification.deleteMany().catch(() => {});
    await prisma.message.deleteMany().catch(() => {});
    await prisma.conversation.deleteMany().catch(() => {});
    await prisma.messageTemplate.deleteMany().catch(() => {});
    await prisma.timelineEvent.deleteMany().catch(() => {});
    await prisma.feedback.deleteMany().catch(() => {});
    await prisma.enquiry.deleteMany().catch(() => {});
    await prisma.knowledgeArticle.deleteMany().catch(() => {});
    await prisma.auditLog.deleteMany().catch(() => {});
    await prisma.aiMessage.deleteMany().catch(() => {});
    await prisma.aiConversation.deleteMany().catch(() => {});
    await prisma.loyaltyTransaction.deleteMany().catch(() => {});
    await prisma.loyaltyRule.deleteMany().catch(() => {});
    await prisma.loyaltyAccount.deleteMany().catch(() => {});
    await prisma.coupon.deleteMany().catch(() => {});
    await prisma.customerNote.deleteMany().catch(() => {});
    await prisma.pushDevice.deleteMany().catch(() => {});
    await prisma.session.deleteMany().catch(() => {});
    await prisma.passwordReset.deleteMany().catch(() => {});
    await prisma.emailVerification.deleteMany().catch(() => {});
    await prisma.customerProfile.deleteMany().catch(() => {});
    await prisma.customerPharmacy.deleteMany().catch(() => {});
    await prisma.pharmacyOnboardingEvent.deleteMany().catch(() => {});
    await prisma.pharmacyMembership.deleteMany().catch(() => {});
    await prisma.pharmacyIntegration.deleteMany().catch(() => {});
    await prisma.pharmacySettings.deleteMany().catch(() => {});
    await prisma.platformSettings.deleteMany().catch(() => {});
    await prisma.healthScreeningRecord.deleteMany().catch(() => {});
    await prisma.clinicalReferral.deleteMany().catch(() => {});
    await prisma.activeIngredient.deleteMany().catch(() => {});
    await prisma.clinicalTag.deleteMany().catch(() => {});
    await prisma.medicationLookup.deleteMany().catch(() => {});
    await prisma.manufacturer.deleteMany().catch(() => {});
    await prisma.pharmacy.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
  }

  // Seed default medication lookups
  const DEFAULT_LOOKUPS = [
    { kind: "dosage_form", value: "Tablet", slug: "tablet", sortOrder: 10 },
    { kind: "dosage_form", value: "Capsule", slug: "capsule", sortOrder: 20 },
    { kind: "dosage_form", value: "Syrup", slug: "syrup", sortOrder: 30 },
    { kind: "dosage_form", value: "Injection", slug: "injection", sortOrder: 40 },
    { kind: "dosage_form", value: "Cream", slug: "cream", sortOrder: 50 },
    { kind: "dosage_form", value: "Ointment", slug: "ointment", sortOrder: 60 },
    { kind: "dosage_form", value: "Eye Drops", slug: "eye-drops", sortOrder: 70 },
    { kind: "dosage_form", value: "Ear Drops", slug: "ear-drops", sortOrder: 80 },
    { kind: "dosage_form", value: "Nasal Spray", slug: "nasal-spray", sortOrder: 90 },
    { kind: "dosage_form", value: "Suspension", slug: "suspension", sortOrder: 100 },
    { kind: "dosage_form", value: "Inhaler", slug: "inhaler", sortOrder: 110 },
    { kind: "dosage_form", value: "Sachet", slug: "sachet", sortOrder: 120 },
    { kind: "route", value: "Oral", slug: "oral", sortOrder: 10 },
    { kind: "route", value: "Topical", slug: "topical", sortOrder: 20 },
    { kind: "route", value: "Intravenous", slug: "intravenous", sortOrder: 30 },
    { kind: "route", value: "Intramuscular", slug: "intramuscular", sortOrder: 40 },
    { kind: "route", value: "Inhalation", slug: "inhalation", sortOrder: 50 },
    { kind: "pregnancy_category", value: "A", slug: "a", sortOrder: 10 },
    { kind: "pregnancy_category", value: "B", slug: "b", sortOrder: 20 },
    { kind: "pregnancy_category", value: "C", slug: "c", sortOrder: 30 },
    { kind: "pregnancy_category", value: "D", slug: "d", sortOrder: 40 },
    { kind: "pregnancy_category", value: "X", slug: "x", sortOrder: 50 },
  ];
  for (const l of DEFAULT_LOOKUPS) {
    await prisma.medicationLookup.upsert({
      where: { kind_slug: { kind: l.kind as any, slug: l.slug } },
      create: { kind: l.kind as any, value: l.value, slug: l.slug, sortOrder: l.sortOrder, active: true },
      update: {},
    });
  }

  const password = await hash("Password123!");

  const AETHER_ID = "00000000-0000-4000-a000-000000000001";
  const COAST_ID = "00000000-0000-4000-a000-000000000002";

  const platformAdmin = await prisma.user.create({
    data: {
      email: "platform@aether.health",
      passwordHash: password,
      role: "manager",
      emailVerified: true,
      platformAdmin: true,
      platformRole: "super_admin",
      twoFactorEnabled: false,
    },
  });

  const aether = await prisma.pharmacy.create({
    data: {
      id: AETHER_ID,
      slug: "aether",
      name: "Aether Pharmacy",
      legalName: "Aether Pharmacy Ltd",
      tagline: "Your neighbourhood pharmacy, built on trust",
      description:
        "Aether Pharmacy has served families across Nairobi for over 15 years with expert dispensing, personalised counselling, and convenient care services.",
      licenseNumber: "PPB-DEMO-0001",
      status: "active",
      lifecycleStatus: "active",
      listed: true,
      featured: true,
      email: "support@gtss.software",
      phone: "+254790670542",
      whatsapp: "+254790670542",
      city: "Nairobi",
      county: "Nairobi",
      country: "Kenya",
      ownerUserId: platformAdmin.id,
      verifiedAt: new Date(),
      verifiedById: platformAdmin.id,
      goLiveAt: new Date(),
      setupCompletedAt: new Date(),
      settings: {
        create: {
          displayName: "Aether Pharmacy",
          phone: "+254790670542",
          email: "support@gtss.software",
          whatsapp: "+254790670542",
          addressLine1: "Kenyatta Avenue",
          city: "Nairobi",
          state: "Nairobi",
          zip: "00100",
          country: "Kenya",
        },
      },
      integrations: { create: {} },
    },
  });

  const coast = await prisma.pharmacy.create({
    data: {
      id: COAST_ID,
      slug: "coast-care",
      name: "Coast Care Pharmacy",
      legalName: "Coast Care Pharmacy Ltd",
      tagline: "Mombasa's family pharmacy",
      description: "Walk-in dispensing and vaccinations along Moi Avenue.",
      licenseNumber: "PPB-DEMO-0002",
      status: "active",
      lifecycleStatus: "active",
      listed: true,
      featured: false,
      email: "coast@aether.health",
      phone: "+254722000222",
      city: "Mombasa",
      county: "Mombasa",
      country: "Kenya",
      goLiveAt: new Date(),
      setupCompletedAt: new Date(),
      settings: {
        create: {
          displayName: "Coast Care Pharmacy",
          phone: "+254722000222",
          email: "coast@aether.health",
          city: "Mombasa",
          state: "Mombasa",
          country: "Kenya",
          about:
            "Coast Care has served families around Moi Avenue since 2009 — walk-in dispensing, morning vaccination hours, and a delivery rider who knows every shortcut between Nyali and Likoni.",
          // Storefront Studio override document — proves one template can wear
          // many personalities. Aether stays on pure defaults.
          storefront: {
            version: 1,
            hero: {
              subline: "right here on the coast.",
              kickerBadge: "Open Monday–Saturday · Moi Avenue",
            },
            theme: {
              brandPrimary: "#0e7490",
              brandAccent: "#d97706",
            },
            whyChooseUs: {
              bullets: [
                "Pharmacists on shift from open to close",
                "__DELIVERY__",
                "Same-day refills before 3 PM",
                "Vaccination mornings every Saturday",
              ],
            },
            deliverySteps: [
              "Send your estate or landmark via WhatsApp or the form below.",
              "Request a refill or have a prescription ready at the counter.",
              "We prepare your order and confirm the rider window.",
              "Pay by M-Pesa on delivery — SMS receipt included.",
            ],
            careers: {
              heading: "Join the Coast Care crew",
            },
          },
        },
      },
      integrations: { create: {} },
    },
  });

  await prisma.pharmacy.create({
    data: {
      slug: "highlands",
      name: "Highlands Pharmacy",
      legalName: "Highlands Pharmacy Nakuru",
      tagline: "Care on the Rift",
      licenseNumber: "PPB-PENDING-0003",
      status: "submitted",
      listed: false,
      phone: "+254733000333",
      city: "Nakuru",
      county: "Nakuru",
      submittedAt: new Date(),
      onboardingEvents: {
        create: { type: "submitted", message: "Demo application awaiting review" },
      },
    },
  });

  await prisma.platformSettings.upsert({
    where: { id: "platform" },
    create: { id: "platform" },
    update: {},
  }).catch(() => {});

  const manager = await prisma.user.create({
    data: {
      email: "manager@aetherpharmacy.com",
      passwordHash: password,
      role: "manager",
      emailVerified: true,
    },
  });

  const pharmacist = await prisma.user.create({
    data: {
      email: "pharmacist@aetherpharmacy.com",
      passwordHash: password,
      role: "pharmacist",
      emailVerified: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff@aetherpharmacy.com",
      passwordHash: password,
      role: "staff",
      emailVerified: true,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: "jane@example.com",
      passwordHash: password,
      role: "customer",
      emailVerified: true,
      phoneVerified: true,
    },
  });

  const customer2User = await prisma.user.create({
    data: {
      email: "john@example.com",
      passwordHash: password,
      role: "customer",
      emailVerified: true,
    },
  });

  // Caregiver user — demo login for /caregiver portal.
  const caregiverUser = await prisma.user.create({
    data: {
      email: "peter@example.com",
      passwordHash: password,
      role: "caregiver",
      emailVerified: true,
    },
  });

  await prisma.pharmacyMembership.createMany({
    data: [
      {
        pharmacyId: AETHER_ID,
        userId: platformAdmin.id,
        role: "owner",
        status: "active",
        acceptedAt: new Date(),
      },
      {
        pharmacyId: AETHER_ID,
        userId: manager.id,
        role: "owner",
        status: "active",
        acceptedAt: new Date(),
      },
      {
        pharmacyId: AETHER_ID,
        userId: pharmacist.id,
        role: "pharmacist",
        status: "active",
        acceptedAt: new Date(),
      },
      {
        pharmacyId: AETHER_ID,
        userId: staff.id,
        role: "staff",
        status: "active",
        acceptedAt: new Date(),
      },
      {
        pharmacyId: COAST_ID,
        userId: manager.id,
        role: "manager",
        status: "active",
        acceptedAt: new Date(),
      },
    ],
  });

  const jane = await prisma.customerProfile.create({
    data: {
      userId: customerUser.id,
      fullName: "Jane Wanjiku",
      phone: "+254712345678",
      dateOfBirth: new Date("1968-05-12"),
      gender: "female",
      addressLine1: "12 Riverside Drive",
      city: "Nairobi",
      state: "Nairobi",
      zip: "00100",
      preferredCommunication: "whatsapp",
      emergencyContactName: "Peter Wanjiku",
      emergencyContactPhone: "+254722000111",
      preferredBranch: "Main Branch",
      tags: ["diabetes", "monthly-refill"],
      preferences: { create: { marketingConsent: true, reminderConsent: true } },
    },
  });

  const john = await prisma.customerProfile.create({
    data: {
      userId: customer2User.id,
      fullName: "John Otieno",
      phone: "+254733444555",
      dateOfBirth: new Date("1985-11-03"),
      gender: "male",
      city: "Nairobi",
      preferredCommunication: "email",
      preferredBranch: "Main Branch",
      tags: ["new"],
      preferences: { create: {} },
    },
  });

  await prisma.customerPharmacy.createMany({
    data: [
      { customerId: jane.id, pharmacyId: AETHER_ID, preferred: true },
      { customerId: jane.id, pharmacyId: COAST_ID, preferred: false },
      { customerId: john.id, pharmacyId: AETHER_ID, preferred: true },
    ],
  });

  const segments = await Promise.all(
    [
      { name: "Monthly refill customers", description: "Customers on recurring monthly refills", isSystem: true },
      { name: "Diabetes care", description: "Patients managing diabetes", isSystem: true },
      { name: "Hypertension", description: "Blood pressure care cohort", isSystem: true },
      { name: "Asthma", description: "Respiratory care cohort", isSystem: true },
      { name: "Family customers", description: "Households with multiple profiles", isSystem: true },
      { name: "Senior citizens", description: "Customers aged 65+", isSystem: true },
      { name: "New customers", description: "Registered in the last 90 days", isSystem: true },
      { name: "Dormant customers", description: "No activity in 6+ months", isSystem: true },
    ].map((s) =>
      prisma.segment.create({
        data: {
      pharmacyId: AETHER_ID, ...s, createdById: manager.id },
      }),
    ),
  );

  const seg = (name: string) => segments.find((s) => s.name === name)!;

  await prisma.customerSegment.createMany({
    data: [
      { customerId: jane.id, segmentId: seg("Monthly refill customers").id },
      { customerId: jane.id, segmentId: seg("Diabetes care").id },
      { customerId: jane.id, segmentId: seg("Senior citizens").id },
      { customerId: john.id, segmentId: seg("New customers").id },
      { customerId: john.id, segmentId: seg("Hypertension").id },
    ],
  });

  const metformin = await prisma.prescription.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: jane.id,
      medicineName: "Metformin 500mg",
      rxReference: "RX-2024-88421",
      dosage: "1 tablet twice daily with meals",
      quantity: 60,
      refillsRemaining: 3,
      lastFilledAt: new Date("2026-07-01"),
      nextRefillDue: new Date("2026-08-01"),
      prescriber: "Dr. Amina Hassan",
      status: "active",
    },
  });

  await prisma.prescription.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: jane.id,
      medicineName: "Atorvastatin 20mg",
      rxReference: "RX-2024-88422",
      dosage: "1 tablet at night",
      quantity: 30,
      refillsRemaining: 2,
      lastFilledAt: new Date("2026-07-05"),
      nextRefillDue: new Date("2026-08-05"),
      prescriber: "Dr. Amina Hassan",
      status: "active",
    },
  });

  await prisma.prescription.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: john.id,
      medicineName: "Amlodipine 5mg",
      rxReference: "RX-2025-11002",
      dosage: "1 tablet daily",
      quantity: 30,
      refillsRemaining: 5,
      lastFilledAt: new Date("2026-07-20"),
      nextRefillDue: new Date("2026-08-20"),
      prescriber: "Dr. James Kariuki",
      status: "active",
    },
  });

  // ── Medication schedules + dose logs (demo data for the adherence module) ──
  // Jane takes Metformin twice daily (08:00, 20:00). We seed 7 days of dose
  // logs so the caregiver dashboard has meaningful data to show.
  const metforminScheduleMorning = await prisma.medicationSchedule.create({
    data: {
      pharmacyId: AETHER_ID,
      prescriptionId: metformin.id,
      customerId: jane.id,
      timeOfDay: "08:00",
      label: "Morning",
      active: true,
    },
  });
  const metforminScheduleEvening = await prisma.medicationSchedule.create({
    data: {
      pharmacyId: AETHER_ID,
      prescriptionId: metformin.id,
      customerId: jane.id,
      timeOfDay: "20:00",
      label: "Evening",
      active: true,
    },
  });

  // Backfill last 7 days of dose logs for Metformin.
  for (let i = 7; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const scheduledDate = new Date(dateStr + "T00:00:00Z");

    // Mostly taken, with a couple of missed/late to make the adherence ~85%.
    const morningStatus: "taken" | "missed" | "late" =
      i === 5 ? "missed" : i === 3 ? "late" : "taken";
    const eveningStatus: "taken" | "missed" | "skipped" =
      i === 5 ? "missed" : i === 2 ? "skipped" : "taken";

    await prisma.doseLog.create({
      data: {
        prescriptionId: metformin.id,
        customerId: jane.id,
        scheduleId: metforminScheduleMorning.id,
        scheduledDate,
        scheduledTime: "08:00",
        confirmedAt: morningStatus === "missed" ? null : new Date(d.getTime() + 8 * 60 * 60 * 1000),
        status: morningStatus,
        recordedBy: i % 3 === 0 ? "caregiver" : "customer",
        caregiverId: i % 3 === 0 ? (await prisma.caregiver.findFirst({ where: { customerId: jane.id } }))?.id ?? null : null,
      },
    });
    await prisma.doseLog.create({
      data: {
        prescriptionId: metformin.id,
        customerId: jane.id,
        scheduleId: metforminScheduleEvening.id,
        scheduledDate,
        scheduledTime: "20:00",
        confirmedAt: eveningStatus === "missed" ? null : new Date(d.getTime() + 20 * 60 * 60 * 1000),
        status: eveningStatus,
        recordedBy: "customer",
      },
    });

    // Also write the daily PrescriptionAdherence summary row so the legacy
    // adherence display still works.
    const dailyStatus = morningStatus === "missed" || eveningStatus === "missed" ? "missed"
      : morningStatus === "late" ? "late"
      : eveningStatus === "skipped" ? "skipped"
      : "taken";
    await prisma.prescriptionAdherence.create({
      data: {
        customerId: jane.id,
        prescriptionId: metformin.id,
        takenOn: scheduledDate,
        status: dailyStatus,
        recordedBy: "customer",
      },
    });
  }


  const refill = await prisma.refillRequest.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: jane.id,
      prescriptionId: metformin.id,
      medicineName: "Metformin 500mg",
      rxReference: "RX-2024-88421",
      customerName: jane.fullName,
      phone: jane.phone,
      email: customerUser.email,
      pickupPreference: "pickup",
      preferredDate: new Date("2026-08-05"),
      status: "under_review",
      source: "portal",
      assignedToId: pharmacist.id,
    },
  });

  await prisma.refillRequest.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: john.id,
      medicineName: "Amlodipine 5mg",
      rxReference: "RX-2025-11002",
      customerName: john.fullName,
      phone: john.phone,
      email: customer2User.email,
      pickupPreference: "delivery",
      preferredDate: new Date("2026-08-10"),
      status: "submitted",
      source: "website",
    },
  });

  await prisma.caregiver.create({
    data: {
      customerId: jane.id,
      caregiverUserId: caregiverUser.id,
      caregiverName: "Peter Wanjiku",
      caregiverEmail: "peter@example.com",
      caregiverPhone: "+254722000111",
      relationship: "Spouse",
      canRequestRefills: true,
      canReceivePickupNotifications: true,
      canLogAdherence: true,
    },
  });

  await prisma.loyaltyAccount.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: jane.id,
      points: 420,
      lifetimePoints: 1200,
      tier: "gold",
      referralCode: "AEJANE2026",
      transactions: {
        create: [
          { points: 50, type: "bonus", description: "Welcome bonus" },
          { points: 100, type: "earn", description: "Monthly refill completed" },
          { points: 270, type: "earn", description: "Loyalty purchases" },
        ],
      },
    },
  });

  await prisma.loyaltyAccount.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: john.id,
      points: 50,
      lifetimePoints: 50,
      tier: "bronze",
      referralCode: "AEJOHN2026",
      transactions: {
        create: [{ points: 50, type: "bonus", description: "Welcome bonus" }],
      },
    },
  });

  await prisma.loyaltyAccount.create({
    data: {
      pharmacyId: COAST_ID,
      customerId: jane.id,
      points: 80,
      lifetimePoints: 80,
      tier: "bronze",
      referralCode: "CCJANE2026",
      transactions: {
        create: [{ points: 80, type: "bonus", description: "Coast Care welcome" }],
      },
    },
  });

  await prisma.coupon.createMany({
    data: [
      {
        pharmacyId: AETHER_ID,
        code: "WELLNESS10",
        description: "10% off wellness products",
        discountType: "percent",
        discountValue: 10,
        pointsCost: 100,
        maxRedemptions: 500,
      },
      {
        pharmacyId: AETHER_ID,
        code: "FLU2026",
        description: "Free flu shot counselling voucher",
        discountType: "fixed",
        discountValue: 0,
        pointsCost: 0,
      },
    ],
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        pharmacyId: AETHER_ID,
        customerId: jane.id,
        userId: customerUser.id,
        eventType: "registered",
        title: "Account registered",
        description: "Jane created an online account",
        createdById: customerUser.id,
      },
      {
        pharmacyId: AETHER_ID,
        customerId: jane.id,
        eventType: "refill_submitted",
        title: "Refill requested",
        description: "Metformin 500mg — under review",
        metadata: { refillId: refill.id },
        createdById: customerUser.id,
      },
      {
        pharmacyId: AETHER_ID,
        customerId: jane.id,
        eventType: "reminder_sent",
        title: "Refill reminder sent",
        description: "WhatsApp reminder for Metformin",
        createdById: staff.id,
      },
      {
        pharmacyId: AETHER_ID,
        customerId: john.id,
        userId: customer2User.id,
        eventType: "registered",
        title: "Account registered",
        description: "John created an online account",
        createdById: customer2User.id,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        pharmacyId: AETHER_ID,
        customerId: jane.id,
        userId: customerUser.id,
        channel: "in_app",
        type: "refill",
        title: "Refill under review",
        body: "Your Metformin refill is being reviewed by our pharmacist.",
        status: "delivered",
        sentAt: new Date(),
      },
      {
        pharmacyId: AETHER_ID,
        customerId: jane.id,
        userId: customerUser.id,
        channel: "whatsapp",
        type: "reminder",
        title: "Refill reminder",
        body: "Metformin may be running low. Request a refill in your portal.",
        status: "delivered",
        sentAt: new Date(),
      },
      {
        pharmacyId: AETHER_ID,
        customerId: john.id,
        userId: customer2User.id,
        channel: "email",
        type: "welcome",
        title: "Welcome to Aether Pharmacy",
        body: "Thanks for joining. Manage refills and preferences in your portal.",
        status: "opened",
        sentAt: new Date(),
        openedAt: new Date(),
      },
    ],
  });

  await prisma.reminder.createMany({
    data: [
      {
        pharmacyId: AETHER_ID,
        customerId: jane.id,
        type: "refill",
        title: "Metformin refill due",
        body: "Your Metformin supply may be running out soon.",
        channel: "whatsapp",
        scheduledFor: new Date("2026-08-03T09:00:00Z"),
        status: "scheduled",
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        customerId: jane.id,
        type: "birthday",
        title: "Birthday greeting",
        body: "Happy birthday from Aether Pharmacy!",
        channel: "sms",
        scheduledFor: new Date("2026-05-12T08:00:00Z"),
        status: "sent",
        sentAt: new Date("2026-05-12T08:00:00Z"),
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        customerId: john.id,
        type: "wellness",
        title: "Blood pressure awareness week",
        body: "Book a free BP check this week at our Main Branch.",
        channel: "email",
        scheduledFor: new Date("2026-08-15T10:00:00Z"),
        status: "scheduled",
        createdById: manager.id,
      },
    ],
  });

  await prisma.conversation.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: jane.id,
      channel: "email",
      subject: "Delivery to Riverside",
      status: "open",
      assignedToId: staff.id,
      messages: {
        create: [
          {
            direction: "inbound",
            channel: "email",
            senderType: "customer",
            senderId: customerUser.id,
            body: "Can you deliver my refill to Riverside Drive next week?",
            status: "delivered",
          },
          {
            direction: "outbound",
            channel: "email",
            senderType: "staff",
            senderId: staff.id,
            body: "Yes — we deliver to Riverside. Share a preferred date and we will confirm.",
            status: "delivered",
          },
        ],
      },
    },
  });

  await prisma.messageTemplate.createMany({
    data: [
      {
        pharmacyId: AETHER_ID,
        name: "Refill ready for pickup",
        channel: "sms",
        body: "Hi {{name}}, your prescription {{medicine}} is ready for pickup at Aether Pharmacy.",
        category: "refill",
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        name: "Refill reminder",
        channel: "whatsapp",
        body: "Hi {{name}}, your {{medicine}} may be running low. Reply REFILL or open your portal to request.",
        category: "reminder",
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        name: "Welcome email",
        channel: "email",
        subject: "Welcome to Aether Pharmacy",
        body: "Thank you for creating an account. Manage refills, caregivers, and preferences anytime.",
        category: "onboarding",
        createdById: manager.id,
      },
    ],
  });

  await prisma.campaign.create({
    data: {
      pharmacyId: AETHER_ID,
      name: "Diabetes Awareness Month",
      description: "Education + free glucose counselling for diabetes segment",
      channel: "email",
      segmentId: seg("Diabetes care").id,
      subject: "Diabetes care tips from Aether Pharmacy",
      body: "Join us for free glucose counselling this month. Book via your portal or WhatsApp.",
      status: "scheduled",
      scheduledFor: new Date("2026-08-20T09:00:00Z"),
      createdById: manager.id,
      stats: { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0 },
    },
  });

  await prisma.campaign.create({
    data: {
      pharmacyId: AETHER_ID,
      name: "Flu Season 2026",
      description: "Vaccination campaign for all active customers",
      channel: "multi",
      subject: "Protect your family this flu season",
      body: "Walk-in flu vaccines available Mon–Sat. No appointment needed.",
      status: "draft",
      createdById: manager.id,
    },
  });

  await prisma.enquiry.createMany({
    data: [
      {
        pharmacyId: AETHER_ID,
        customerId: john.id,
        name: john.fullName,
        email: customer2User.email,
        phone: john.phone,
        type: "delivery",
        subject: "Delivery coverage",
        message: "Do you deliver to Westlands on weekends?",
        status: "new",
        source: "website",
      },
      {
        pharmacyId: AETHER_ID,
        name: "Mary Kamau",
        email: "mary@example.com",
        phone: "+254700111222",
        type: "product_availability",
        subject: "Blood pressure monitor",
        message: "Do you stock home BP monitors?",
        status: "in_progress",
        assignedToId: staff.id,
        source: "website",
      },
    ],
  });

  await prisma.feedback.createMany({
    data: [
      {
        pharmacyId: AETHER_ID,
        customerId: jane.id,
        name: jane.fullName,
        email: customerUser.email,
        rating: 5,
        type: "review",
        title: "Always helpful",
        body: "The pharmacists explain everything clearly. Love the refill reminders.",
        status: "responded",
        staffResponse: "Thank you Jane — we appreciate you!",
        respondedById: manager.id,
        respondedAt: new Date(),
        isPublic: true,
      },
      {
        pharmacyId: AETHER_ID,
        name: "Anonymous",
        rating: 3,
        type: "suggestion",
        title: "Longer Saturday hours",
        body: "Please stay open later on Saturdays.",
        status: "new",
      },
    ],
  });

  await prisma.knowledgeArticle.createMany({
    data: [
      {
        pharmacyId: AETHER_ID,
        title: "Opening hours",
        category: "store",
        content:
          "Monday–Friday 8:00 AM–8:00 PM; Saturday 9:00 AM–6:00 PM; Sunday 10:00 AM–4:00 PM. Main Branch on Kenyatta Avenue, Nairobi.",
        tags: ["hours", "location"],
        priority: 100,
        isApproved: true,
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        title: "How to request a refill",
        category: "refills",
        content:
          "Customers can request refills via the website form, customer portal, or by calling/WhatsApp. Staff review each request. Statuses: Submitted → Under Review → Approved → Preparing → Ready for Pickup → Collected.",
        tags: ["refill", "process"],
        priority: 90,
        isApproved: true,
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        title: "Delivery information",
        category: "delivery",
        content:
          "Delivery available within Nairobi for eligible prescriptions. Same-day slots when capacity allows. Delivery enquiries can be submitted online.",
        tags: ["delivery"],
        priority: 80,
        isApproved: true,
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        title: "Clinical safety rules for AI",
        category: "policy",
        content:
          "AI must never diagnose, recommend medication, modify prescriptions, interpret lab results, or make clinical decisions. Escalate uncertain queries to pharmacy staff.",
        tags: ["ai", "safety"],
        priority: 100,
        isApproved: true,
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        title: "Insurance accepted",
        category: "store",
        content:
          "We accept major plans including Blue Cross Blue Shield, Aetna, UnitedHealthcare, Cigna, Medicare, Medicaid, Humana, and most major plans.",
        tags: ["insurance"],
        priority: 70,
        isApproved: true,
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        title: "Vaccinations at Aether Pharmacy",
        category: "services",
        content:
          "Where locally authorised, Aether Pharmacy administers adult, seasonal, and selected travel vaccines (influenza, COVID-19, hepatitis B, Tdap, pneumococcal, HPV catch-up, typhoid, hepatitis A, meningococcal, oral cholera). Every dose requires a pre-vaccination questionnaire, vaccine information sheet, signed consent, lot/expiry recording, and 15 minutes of observation. Digital certificates appear in the patient portal. Childhood KEPI vaccines are given at public immunisation clinics; we provide schedules and referral. Yellow fever ICVP cards are issued only at designated centres.",
        tags: ["vaccine", "vaccination", "flu", "immunisation", "travel", "consent", "aefi"],
        priority: 96,
        isApproved: true,
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        title: "Preventive-health counselling",
        category: "services",
        content:
          "Pharmacists offer preventive counselling: immunisation education, travel health, tobacco cessation, diabetes prevention, cardiovascular risk, weight and nutrition, malaria prevention, and HIV prevention information. Sessions are education and support, not a diagnosis. Book via the Preventive health page or the patient portal.",
        tags: ["prevention", "counselling", "travel", "campaign"],
        priority: 94,
        isApproved: true,
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        title: "Health Screening & Point-of-Care Testing (POCT)",
        category: "services",
        content:
          "Aether Pharmacy provides walk-in and booked health screening services including blood pressure checks, capillary blood glucose testing, weight & BMI calculations, temperature measurement, and authorized Kenyan point-of-care rapid tests (Malaria RDT, lipid panel, HbA1c, urinalysis). Screenings are conducted with calibrated clinical devices by licensed pharmacy professionals.",
        tags: ["screening", "vitals", "blood pressure", "glucose", "bmi", "poct", "wellness"],
        priority: 95,
        isApproved: true,
        createdById: manager.id,
      },
      {
        pharmacyId: AETHER_ID,
        title: "Screening vs Diagnosis & Medical Referral Pathways",
        category: "policy",
        content:
          "Health screening is a preliminary evaluation to detect early risk factors and out-of-range vitals; screening is NOT the same thing as diagnosing a medical condition. When a screening test or vital parameter reveals abnormal findings, our pharmacists issue structured clinical referrals to Clinics, Hospitals (e.g. KNH, Aga Khan, Nairobi Hospital), Laboratories (e.g. Lancet Kenya), Specialists (Cardiologists, Endocrinologists), or Emergency EMS (Kenya Red Cross 1199, National 999/112, St John Ambulance).",
        tags: ["screening", "diagnosis", "referral", "hospitals", "clinics", "specialists", "emergency"],
        priority: 95,
        isApproved: true,
        createdById: manager.id,
      },
    ],
  });

  await prisma.customerNote.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: jane.id,
      authorId: pharmacist.id,
      body: "Prefers WhatsApp updates. Counselled on metformin with meals.",
      isPinned: true,
    },
  });

  // ── Pharmacy services (public catalogue) ───────────────────
  // Wipe + reseed so demo always mirrors the public content set.
  await prisma.serviceBooking.deleteMany().catch(() => {});
  await prisma.pharmacyService.deleteMany().catch(() => {});

  const serviceSeeds: Array<{
    slug: string;
    title: string;
    short: string;
    description: string;
    benefits: string[];
    eligibility: string;
    duration: string;
    imageUrl: string;
    icon: string;
    price: number | null;
    sortOrder: number;
  }> = [
    {
      slug: "prescription-dispensing",
      title: "Prescription Dispensing",
      short:
        "Accurate, timely filling of prescriptions with pharmacist counselling on every new medication.",
      description:
        "Our pharmacists carefully review each prescription for accuracy, interactions, and appropriateness before dispensing. You receive clear counselling on how to take your medication, what to expect, and when to follow up.",
      benefits: [
        "Double-check safety review on every fill",
        "Plain-language counselling",
        "Insurance coordination and copay assistance tips",
        "Generic alternatives when appropriate",
      ],
      eligibility: "Valid prescription from a licensed prescriber.",
      duration: "Most prescriptions ready within 30–45 minutes.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/prescription-dispensing.webp",
      icon: "pill",
      price: null,
      sortOrder: 10,
    },
    {
      slug: "prescription-refills",
      title: "Prescription Refills",
      short:
        "Request refills online or by phone — ready for pickup or delivery when you need them.",
      description:
        "Never run out of essential medication. Request a refill through our online form, WhatsApp, or phone. We will confirm availability and let you know when your order is ready.",
      benefits: [
        "Online refill requests 24/7",
        "Reminder-friendly pickup windows",
        "Auto-refill setup for maintenance meds",
        "Transfer from other pharmacies welcome",
      ],
      eligibility: "Existing prescription on file with remaining refills, or new transfer.",
      duration: "Typically ready same day when requested before 3 PM.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp",
      icon: "refresh",
      price: null,
      sortOrder: 20,
    },
    {
      slug: "medication-counselling",
      title: "Medication Counselling",
      short:
        "One-on-one time with a pharmacist to understand your regimen, side effects, and interactions.",
      description:
        "Whether you are starting a new therapy or managing multiple medications, our pharmacists provide private counselling sessions so you feel confident and informed.",
      benefits: [
        "Private consultation space",
        "Full regimen review",
        "Side-effect and interaction guidance",
        "Adherence strategies that fit your life",
      ],
      eligibility: "Open to all patients; appointments preferred for longer reviews.",
      duration: "15–30 minutes depending on complexity.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp",
      icon: "chat",
      price: 500,
      sortOrder: 30,
    },
    {
      slug: "blood-pressure-checks",
      title: "Blood Pressure Checks",
      short: "Walk-in blood pressure screening with guidance on readings and next steps.",
      description:
        "Know your numbers. Free walk-in blood pressure checks are available during open hours. Our team explains your reading and can discuss lifestyle tips or when to see your doctor.",
      benefits: [
        "Free walk-in service",
        "Calibrated equipment",
        "Printed or verbal results",
        "Referral guidance when needed",
      ],
      eligibility: "Adults and teens; no appointment required.",
      duration: "About 5–10 minutes.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/understanding-blood-pressure.webp",
      icon: "heart",
      price: null,
      sortOrder: 40,
    },
    {
      slug: "diabetes-management",
      title: "Diabetes Management Support",
      short: "Supplies, education, and pharmacist support for living well with diabetes.",
      description:
        "From glucose monitors and test strips to counselling on medications and lifestyle, we support patients with type 1 and type 2 diabetes every step of the way.",
      benefits: [
        "Meter and strip supply coordination",
        "Medication and insulin counselling",
        "Hypoglycaemia education",
        "Insurance supply authorisation help",
      ],
      eligibility: "Patients with diabetes or prediabetes.",
      duration: "Counselling sessions 20–40 minutes by appointment.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/diabetes-everyday-tips.webp",
      icon: "activity",
      price: 800,
      sortOrder: 50,
    },
    {
      slug: "vaccinations",
      title: "Vaccinations",
      short:
        "Flu, COVID-19, shingles, pneumonia, and travel vaccines administered by certified pharmacists.",
      description:
        "Stay protected with convenient on-site immunisations. We stock seasonal and year-round vaccines and can advise on schedules for adults and eligible children.",
      benefits: [
        "Walk-in and appointment options",
        "Insurance billing when applicable",
        "Digital vaccine records",
        "Travel vaccine guidance",
      ],
      eligibility: "Age and medical criteria vary by vaccine; pharmacist will screen.",
      duration: "10–20 minutes including observation.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/vaccinations.webp",
      icon: "shield",
      price: 1500,
      sortOrder: 60,
    },
    {
      slug: "health-screenings",
      title: "Health Screenings & Vitals",
      short: "Blood pressure, glucose, BMI, temperature, and authorized point-of-care rapid tests.",
      description:
        "Preventive health screenings conducted by licensed pharmacists using calibrated clinical equipment. We screen for blood pressure, blood glucose, weight, BMI, body temperature, and authorized point-of-care tests (Malaria RDT, Lipid panel, HbA1c, Urinalysis). While screening is not a medical diagnosis, our pharmacists provide immediate results and structured clinical referrals to Clinics, Hospitals, Laboratories, Specialists, or Emergency EMS whenever further assessment is indicated.",
      benefits: [
        "Blood pressure & pulse rate checks",
        "Capillary blood glucose & HbA1c testing",
        "Weight, height & BMI calculation",
        "Temperature & pulse oximetry (SpO2)",
        "Authorized POCT rapid tests (Malaria RDT, Lipids, Urinalysis)",
        "Screening vs Diagnosis clinical counselling",
        "Structured referrals to Clinics, Hospitals, Labs & Specialists",
        "Immediate emergency EMS escalation protocol",
      ],
      eligibility: "Open to all adults and teens; walk-in or advance booking available.",
      duration: "10–20 minutes depending on test panel.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/modern_care_tools.webp",
      icon: "clipboard",
      price: 1000,
      sortOrder: 70,
    },
    {
      slug: "delivery-services",
      title: "Delivery Services",
      short: "Safe, reliable medication delivery to homes across greater Nairobi.",
      description:
        "Cannot make it in? We deliver prescriptions and select OTC items within our service area. Temperature-sensitive medications are handled with care.",
      benefits: [
        "Same-day delivery on select routes",
        "Signature confirmation available",
        "WhatsApp status updates",
        "Caregiver-friendly handoff options",
      ],
      eligibility: "Addresses within our delivery zones (see Delivery page).",
      duration: "Usually within 2–6 hours of ready status on delivery days.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/delivery-services.webp",
      icon: "truck",
      price: 300,
      sortOrder: 80,
    },
    {
      slug: "home-care-support",
      title: "Home Care Support",
      short:
        "Medication organisation, blister packs, and caregiver coordination for home-based care.",
      description:
        "We partner with families and home-care agencies to simplify complex regimens — including multi-dose packaging, refill calendars, and caregiver briefings.",
      benefits: [
        "Weekly blister packaging",
        "Caregiver education",
        "Regimen simplification reviews",
        "Coordination with visiting nurses",
      ],
      eligibility: "Patients managing multiple medications or with caregiver support.",
      duration: "Setup consultation 30–45 minutes.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/home-care-support.webp",
      icon: "home",
      price: 2000,
      sortOrder: 90,
    },
  ];

  for (const s of serviceSeeds) {
    await prisma.pharmacyService.create({
      data: {
      pharmacyId: AETHER_ID,
        slug: s.slug,
        title: s.title,
        short: s.short,
        description: s.description,
        benefits: s.benefits,
        eligibility: s.eligibility,
        duration: s.duration,
        imageUrl: s.imageUrl,
        icon: s.icon,
        price: s.price,
        bookable: true,
        active: true,
        sortOrder: s.sortOrder,
      },
    });
  }
  console.log(`Seeded ${serviceSeeds.length} pharmacy services.`);

  // ── Medication categories (public images + tips) ───────────
  const categorySeeds: Array<{
    slug: string;
    name: string;
    description: string;
    imageUrl: string;
    brands: string[];
    tips: string[];
    sortOrder: number;
  }> = [
    {
      slug: "pain-relief",
      name: "Pain Relief",
      description:
        "Over-the-counter options for headaches, muscle aches, joint pain, and everyday discomfort — with pharmacist guidance on safe use.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/pain-relief.webp",
      brands: ["Panadol", "Brufen", "Voltaren", "Deep Heat", "Disprin", "Advil"],
      tips: [
        "Do not combine multiple products containing acetaminophen.",
        "Ask us before using NSAIDs if you have stomach, kidney, or heart concerns.",
        "Topical options can help localised muscle or joint pain.",
      ],
      sortOrder: 10,
    },
    {
      slug: "cold-flu",
      name: "Cold & Flu",
      description:
        "Symptom relief for coughs, congestion, sore throats, and seasonal illness — plus guidance on what actually helps.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/cold-flu.webp",
      brands: ["Benylin", "Otrivin", "Strepsils", "Vicks", "Actifed", "Mucinex"],
      tips: [
        "Multi-symptom products can duplicate ingredients — check labels.",
        "Hydration and rest still matter more than most OTC combos.",
        "High fever, shortness of breath, or lasting symptoms need clinical care.",
      ],
      sortOrder: 20,
    },
    {
      slug: "allergy-treatments",
      name: "Allergy Treatments",
      description:
        "Non-drowsy antihistamines, corticosteroid nasal sprays, and eye drops for seasonal hay fever, pet dander, and allergic skin reactions.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/seasonal-allergy-guide.webp",
      brands: ["Zyrtec", "Clarityn", "Telfast", "Flixonase", "Optrex", "Allegra"],
      tips: [
        "Second-generation antihistamines provide 24-hour relief with minimal drowsiness.",
        "Steroid nasal sprays work best when used daily across allergy season.",
        "Seek emergency care for facial swelling or throat tightness.",
      ],
      sortOrder: 30,
    },
    {
      slug: "digestive-health",
      name: "Digestive Health",
      description:
        "Antacids, acid reducers, oral rehydration salts, anti-diarrheals, laxatives, and daily probiotics for digestive balance.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp",
      brands: ["Gaviscon", "Imodium", "Dioralyte", "Dulcolax", "Bio-Kult", "Prilosec"],
      tips: [
        "Oral rehydration salts are the first priority for acute fluid loss.",
        "Short-course acid reducers take 1–4 days for full 24-hour symptom control.",
        "Black tarry stools or difficulty swallowing require immediate doctor evaluation.",
      ],
      sortOrder: 40,
    },
    {
      slug: "first-aid",
      name: "First Aid",
      description:
        "Bandages, antiseptics, wound care, and emergency basics so you are prepared at home, work, or on the go.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/first-aid.webp",
      brands: ["Band-Aid", "Burnshield", "3M Nexcare", "Elastoplast", "Curad"],
      tips: [
        "Clean wounds gently; seek care for deep or dirty cuts.",
        "Keep a basic kit in the car and at home.",
        "Check expiry dates on antiseptics and ointments yearly.",
      ],
      sortOrder: 50,
    },
    {
      slug: "topical-treatments",
      name: "Topical Treatments",
      description:
        "Hydrocortisone anti-itch creams, antifungal treatments, calming lotions, and hemorrhoidal soothing care.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/skin-care.webp",
      brands: ["Canesten", "Neosporin", "Anusol", "Cortizone", "Calamine"],
      tips: [
        "Apply hydrocortisone thinly for a maximum of 7 consecutive days.",
        "Continue antifungal creams for 1–2 weeks after symptoms disappear.",
        "Never apply steroid creams to open wounds or active viral infections.",
      ],
      sortOrder: 60,
    },
    {
      slug: "skin-care",
      name: "Skin Care",
      description:
        "Dermatologist-friendly moisturisers, sunscreens, acne care, and treatments for eczema, rashes, and everyday skin concerns.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/skin-care.webp",
      brands: ["CeraVe", "La Roche-Posay", "Epimax", "Cetaphil", "PanOxyl", "Eucerin"],
      tips: [
        "Fragrance-free often means fewer irritations.",
        "Daily SPF is one of the best long-term skin investments.",
        "Persistent rashes deserve a professional look — we can advise.",
      ],
      sortOrder: 70,
    },
    {
      slug: "antiseptics",
      name: "Antiseptics",
      description:
        "Povidone-iodine solutions, chlorhexidine washes, hydrogen peroxide, and sterile alcohol skin preparation wipes.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
      brands: ["Betadine", "Dettol", "Savlon", "Hibiclens", "Medi-Swab"],
      tips: [
        "Povidone-iodine provides broad antimicrobial protection without skin stinging.",
        "Allow antiseptic liquids to air dry completely on skin before dressing.",
        "Deep puncture wounds or dirty animal bites need doctor evaluation.",
      ],
      sortOrder: 80,
    },
    {
      slug: "wound-care",
      name: "Wound Care",
      description:
        "Hydrocolloid dressings, sterile non-stick pads, wound irrigation saline, and medical silicone scar reduction gels.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/first-aid.webp",
      brands: ["DuoDERM", "Melolin", "Kelo-Cote", "Steri-Strip", "Opsite"],
      tips: [
        "Moist wound healing under hydrocolloid dressings speeds healing and reduces scarring.",
        "Irrigate with sterile saline rather than harsh scrubbing.",
        "Seek care if wound edges gape or redness spreads outward.",
      ],
      sortOrder: 90,
    },
    {
      slug: "oral-care",
      name: "Oral Care",
      description:
        "Chlorhexidine mouthwashes, mouth ulcer soothing gels, fast-acting toothache analgesics, and dry mouth hydrating rinses.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp",
      brands: ["Corsodyl", "Bonjela", "Orajel", "Biotène", "Sensodyne", "Colgate"],
      tips: [
        "Use chlorhexidine mouthwash 30 minutes after brushing.",
        "Apply protective ulcer gels before meals to shield exposed nerve endings.",
        "Any mouth ulcer lasting more than 3 weeks must be examined by a dentist.",
      ],
      sortOrder: 100,
    },
    {
      slug: "feminine-hygiene",
      name: "Feminine Hygiene",
      description:
        "pH-balanced intimate washes, organic sanitary protection, single-dose thrush treatments, and period pain heat patches.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/womens-health.webp",
      brands: ["Always", "Tampax", "Femfresh", "Canesten", "Cura-Heat", "Clearblue"],
      tips: [
        "Vaginal pessaries should be inserted at bedtime for optimal retention.",
        "Only use gentle cleansers externally; the internal vaginal canal is self-cleansing.",
        "Abnormal bleeding or fishy discharge warrants clinical consultation.",
      ],
      sortOrder: 110,
    },
    {
      slug: "baby-care",
      name: "Baby Care",
      description:
        "Gentle essentials for little ones: fever reducers, diaper care, feeding accessories, and pharmacist advice parents can trust.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/baby-care.webp",
      brands: ["Calpol", "Infacol", "Sudocrem", "Little Remedies", "Pampers", "Johnson's"],
      tips: [
        "Always use weight-based dosing for children's medicines.",
        "Never give aspirin to children or teens with viral illness.",
        "ANY fever in an infant under 3 months is an immediate medical emergency.",
      ],
      sortOrder: 120,
    },
    {
      slug: "medical-consumables",
      name: "Medical Consumables",
      description:
        "Digital clinical thermometers, fingertip pulse oximeters, blood pressure monitors, glucose strips, and sterile gloves.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/modern_care_tools.webp",
      brands: ["Omron", "OneTouch", "Accu-Chek", "Contec", "Beurer", "3M"],
      tips: [
        "Rest 5 minutes quietly before taking resting blood pressure readings.",
        "Store glucose strips tightly capped in their original container away from moisture.",
        "SpO2 under 92% or blood pressure >= 180/120 are critical clinical warning signs.",
      ],
      sortOrder: 130,
    },
    {
      slug: "nutritional-products",
      name: "Nutritional Products",
      description:
        "Complete daily multivitamins, effervescent vitamin C + zinc, oral electrolyte hydration, gentle iron, and meal shakes.",
      imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/vitamins-supplements.webp",
      brands: ["Wellman", "Wellwoman", "Berocca", "Hydralyte", "Feroglobin", "Ensure", "Centrum"],
      tips: [
        "Take iron supplements with vitamin C for enhanced absorption; avoid dairy or tea within 2 hours.",
        "Do not exceed upper limits for fat-soluble vitamins (A, D, E, K).",
        "Always disclose supplements to your pharmacist to check for prescription drug interactions.",
      ],
      sortOrder: 140,
    },
    // Aliases and clinical categories
    { slug: "general", name: "General", description: "Uncategorised or multi-use products.", imageUrl: "", brands: [], tips: [], sortOrder: 0 },
    { slug: "allergy", name: "Allergy", description: "Allergy and hay fever treatments.", imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/seasonal-allergy-guide.webp", brands: ["Zyrtec", "Clarityn"], tips: ["Non-drowsy options available."], sortOrder: 35 },
    { slug: "digestive", name: "Digestive", description: "Digestive therapies.", imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp", brands: ["Gaviscon", "Imodium"], tips: ["Hydration is key."], sortOrder: 45 },
    { slug: "womens-health", name: "Women's Health", description: "Reproductive health and wellness.", imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/womens-health.webp", brands: ["Always", "Pregnacare"], tips: ["Discreet counselling available."], sortOrder: 115 },
    { slug: "diabetes-care", name: "Diabetes Care", description: "Meters, strips, and glucose care.", imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/diabetes-everyday-tips.webp", brands: ["OneTouch", "Accu-Chek"], tips: ["Store test strips in a cool dry place."], sortOrder: 135 },
    { slug: "vitamins-supplements", name: "Vitamins & Supplements", description: "Vitamins and nutritional supplements.", imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/vitamins-supplements.webp", brands: ["Nature Made", "Centrum"], tips: ["Ask about interactions."], sortOrder: 145 },
    { slug: "antibiotics", name: "Antibiotics", description: "Prescription antibacterials.", imageUrl: "", brands: [], tips: [], sortOrder: 200 },
    { slug: "cardiovascular", name: "Cardiovascular", description: "Heart and blood pressure therapies.", imageUrl: "", brands: [], tips: [], sortOrder: 210 },
    { slug: "diabetes", name: "Diabetes", description: "Diabetes prescription therapies.", imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/diabetes-everyday-tips.webp", brands: [], tips: [], sortOrder: 220 },
    { slug: "respiratory", name: "Respiratory", description: "Asthma, COPD, and breathing support.", imageUrl: "", brands: [], tips: [], sortOrder: 230 },
    { slug: "vitamins", name: "Vitamins", description: "Clinical vitamin catalogue.", imageUrl: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/vitamins-supplements.webp", brands: [], tips: [], sortOrder: 240 },
  ];

  for (const c of categorySeeds) {
    await prisma.medicationCategory.upsert({
      where: { pharmacyId_slug: { pharmacyId: AETHER_ID, slug: c.slug } },
      create: {
        pharmacyId: AETHER_ID,
        slug: c.slug,
        name: c.name,
        description: c.description || null,
        imageUrl: c.imageUrl || null,
        brands: c.brands,
        tips: c.tips,
        publicVisible: Boolean(c.imageUrl) || ["pain-relief", "vitamins-supplements", "baby-care", "first-aid", "skin-care", "diabetes-care", "womens-health", "cold-flu"].includes(c.slug),
        active: true,
        sortOrder: c.sortOrder,
      },
      update: {
        name: c.name,
        description: c.description || null,
        imageUrl: c.imageUrl || null,
        brands: c.brands,
        tips: c.tips,
        publicVisible: Boolean(c.imageUrl) || ["pain-relief", "vitamins-supplements", "baby-care", "first-aid", "skin-care", "diabetes-care", "womens-health", "cold-flu"].includes(c.slug),
        active: true,
        sortOrder: c.sortOrder,
      },
    });
  }

  // Align common master category aliases so public cards show products.
  // e.g. meds tagged "vitamins" also appear under vitamins-supplements browse if desired —
  // we keep both slugs; form dropdown lists both. Optionally retag sparse slugs:
  const aliasMap: Record<string, string> = {
    // leave masters as-is; public filters use exact master.category
  };
  for (const [from, to] of Object.entries(aliasMap)) {
    await prisma.medicationMaster
      .updateMany({ where: { category: from }, data: { category: to } })
      .catch(() => {});
  }

  // ── Health Screenings & Clinical Referrals (7. Health Screening) ──
  await prisma.clinicalReferral.deleteMany().catch(() => {});
  await prisma.healthScreeningRecord.deleteMany().catch(() => {});

  const screeningJane1 = await prisma.healthScreeningRecord.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: jane.id,
      conductedById: pharmacist.id,
      screeningType: "wellness_check",
      patientName: "Jane Doe",
      patientPhone: "+254712345678",
      patientEmail: "jane@example.com",
      patientAge: 42,
      patientGender: "female",
      systolicBp: 124,
      diastolicBp: 78,
      pulseRate: 72,
      bpCategory: "elevated",
      bloodGlucose: 5.4,
      glucoseUnit: "mmol/L",
      fastingStatus: "fasting",
      glucoseCategory: "normal",
      weightKg: 68.5,
      heightCm: 165,
      bmi: 25.2,
      bmiCategory: "overweight",
      temperatureC: 36.6,
      tempCategory: "normal",
      spO2Percent: 98,
      notes: "Routine quarterly wellness check. Fasting glucose well-controlled on metformin. Advised on low-sodium dietary habits and 30 minutes daily moderate walking.",
      equipmentUsed: "Omron HEM-7120 Blood Pressure Monitor & Accu-Chek Instant",
      requiresReferral: false,
    },
  });

  const screeningJane2 = await prisma.healthScreeningRecord.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: jane.id,
      conductedById: pharmacist.id,
      screeningType: "blood_pressure",
      patientName: "Jane Doe",
      patientPhone: "+254712345678",
      patientEmail: "jane@example.com",
      patientAge: 42,
      patientGender: "female",
      systolicBp: 146,
      diastolicBp: 92,
      pulseRate: 84,
      bpCategory: "stage_2_hypertension",
      bloodGlucose: 6.8,
      glucoseUnit: "mmol/L",
      fastingStatus: "random",
      glucoseCategory: "normal",
      temperatureC: 36.8,
      tempCategory: "normal",
      spO2Percent: 97,
      notes: "Elevated BP noted on 2 consecutive readings (148/94 and 146/92). Patient reported mild occipital headache and work stress. Structured clinical referral provided for physician review.",
      equipmentUsed: "Omron HEM-7120 Calibrated Monitor",
      requiresReferral: true,
      referralUrgency: "urgent",
    },
  });

  await prisma.clinicalReferral.create({
    data: {
      pharmacyId: AETHER_ID,
      screeningId: screeningJane2.id,
      customerId: jane.id,
      referredById: pharmacist.id,
      referenceCode: "REF-202608-4102",
      patientName: "Jane Doe",
      patientPhone: "+254712345678",
      patientEmail: "jane@example.com",
      destinationType: "clinic",
      facilityName: "Avenue Healthcare Outpatient Clinic",
      facilityContact: "+254 711 060000",
      specialistType: "Internal Medicine / Hypertension Review",
      urgency: "urgent",
      reason: "Stage 2 Hypertension (146/92 mmHg) with mild occipital tension in a known diabetic patient.",
      clinicalSummary: "Patient Jane Doe presented for routine pharmacy screening. BP measured 146/92 mmHg (confirmed on repeat at 15-min rest). Random capillary blood glucose 6.8 mmol/L. No acute chest pain, visual changes, or focal neurological deficits. Currently on Metformin 500mg BD. Referred for formal diagnostic workup, ambulatory BP monitoring, and potential antihypertensive initiation.",
      pharmacistRecommendations: "Suggest 24-hr Ambulatory BP Monitoring (ABPM), baseline Serum Creatinine & eGFR, Serum Electrolytes, and Fasting Lipid Panel.",
      status: "issued",
      issuedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.healthScreeningRecord.create({
    data: {
      pharmacyId: AETHER_ID,
      conductedById: pharmacist.id,
      screeningType: "point_of_care_test",
      patientName: "David Ochieng",
      patientPhone: "+254722998877",
      patientAge: 29,
      patientGender: "male",
      systolicBp: 118,
      diastolicBp: 76,
      pulseRate: 98,
      bpCategory: "normal",
      temperatureC: 38.6,
      tempCategory: "high_fever",
      spO2Percent: 96,
      poctType: "malaria_rdt",
      poctResult: "Positive (P. falciparum reactive)",
      notes: "Patient presented with 2-day history of chills, fever, and headache. Rapid Malaria Test positive for P. falciparum. Patient counselled on Artemether-Lumefantrine course and warning signs of severe malaria.",
      equipmentUsed: "WHO-prequalified Malaria HRP2 RDT Cassette & Digital Clinical Thermometer",
      requiresReferral: false,
    },
  });

  console.log("Upserted demo health screenings and clinical referrals.");

  // ── Vaccination & preventive services (8) ──
  await prisma.pharmacyImmunizationPolicy.create({
    data: { pharmacyId: AETHER_ID, ...DEFAULT_IMMUNIZATION_POLICY, updatedById: manager.id },
  });
  await prisma.pharmacyImmunizationPolicy.create({
    data: { pharmacyId: COAST_ID, ...DEFAULT_IMMUNIZATION_POLICY },
  });

  const vaccineRows: Record<string, { id: string }> = {};
  for (const v of VACCINE_CATALOG) {
    const row = await prisma.vaccineProduct.create({
      data: {
      pharmacyId: AETHER_ID,
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
      select: { id: true, slug: true },
    });
    vaccineRows[row.slug] = { id: row.id };
  }

  await prisma.immunizerCredential.createMany({
    data: [
      {
        pharmacyId: AETHER_ID,
        userId: pharmacist.id,
        credentialType: "immunization_certificate",
        title: "Pharmacist Immunisation Certificate",
        licenseNumber: "PPB-IMM-2041",
        issuedBy: "Pharmacy and Poisons Board",
        issuedAt: new Date("2025-01-15"),
        expiresAt: new Date("2028-01-15"),
        verified: true,
      },
      {
        pharmacyId: AETHER_ID,
        userId: pharmacist.id,
        credentialType: "anaphylaxis",
        title: "Anaphylaxis & adrenaline autoinjector",
        issuedBy: "Kenya Red Cross / CPD",
        issuedAt: new Date("2025-06-01"),
        expiresAt: new Date("2027-06-01"),
        verified: true,
      },
      {
        pharmacyId: AETHER_ID,
        userId: pharmacist.id,
        credentialType: "cpr_bls",
        title: "BLS / CPR",
        issuedBy: "Kenya Red Cross",
        issuedAt: new Date("2025-03-01"),
        expiresAt: new Date("2027-03-01"),
        verified: true,
      },
    ],
  });

  const fluCampaign = await prisma.publicHealthCampaign.create({
    data: {
      pharmacyId: AETHER_ID,
      slug: "flu-season-2026",
      title: "Flu season 2026 — protect your household",
      theme: "vaccination",
      short: "Walk-in inactivated influenza vaccine Mon–Sat. 15-minute observation on site.",
      description:
        "Seasonal influenza campaign for adults, caregivers, and people with chronic illness. Screening, vaccine information, and consent are completed before every dose.",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-08-31"),
      targetPopulation: "Adults 18+, especially 65+ and chronic disease",
      vaccinesOffered: ["influenza"],
      walkInDays: "Monday–Saturday 9:00–16:00",
      targetDoses: 400,
      dosesAdministered: 1,
      educationTopics: ["flu-myths", "after-your-vaccine"],
      locationNotes: "Main Branch, Kenyatta Avenue. Private counselling room for observation.",
      regulatoryNotes: "Inactivated influenza only. Pregnancy: pharmacist confirms current MoH position.",
      heroImage: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/vaccinations.webp",
      active: true,
    },
  });

  await prisma.publicHealthCampaign.create({
    data: {
      pharmacyId: AETHER_ID,
      slug: "travel-health-week",
      title: "Travel health week",
      theme: "counselling",
      short: "Destination vaccines, yellow-fever certificate advice, and malaria prevention counselling.",
      description:
        "Book a 30-minute travel consult before you fly. We review itinerary, vaccines, ICVP rules, and bite prevention.",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-12-31"),
      targetPopulation: "Outbound travellers from Nairobi",
      vaccinesOffered: ["typhoid", "hepatitis-a", "meningococcal"],
      walkInDays: "By appointment preferred; walk-ins as capacity allows",
      educationTopics: ["travel-health-kenya"],
      locationNotes: "Bring passport and travel dates.",
      heroImage: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/flu-season-preparation.webp",
      active: true,
    },
  });

  const fluId = vaccineRows["influenza"]?.id;
  if (fluId) {
    const appt = await prisma.immunizationAppointment.create({
      data: {
      pharmacyId: AETHER_ID,
        vaccineProductId: fluId,
        customerId: jane.id,
        campaignId: fluCampaign.id,
        patientName: jane.fullName,
        patientPhone: jane.phone || "+254712345678",
        patientEmail: "jane@example.com",
        patientDob: jane.dateOfBirth,
        patientGender: "female",
        preferredDate: "2026-08-10",
        preferredTime: "10:00",
        status: "completed",
        source: "campaign",
        screening: {
          create: {
            customerId: jane.id,
            screenedById: pharmacist.id,
            answers: { feeling_well: "yes", allergy_vaccine: "no", pregnant: "no" },
            outcome: "eligible",
            outcomeReason: "No contraindications flagged.",
          },
        },
        consent: {
          create: {
            vaccineProductId: fluId,
            customerId: jane.id,
            visProvided: true,
            visVersion: "2026-season",
            visProvidedAt: new Date("2026-08-10T07:00:00Z"),
            consentType: "self",
            consenterName: jane.fullName,
            signatureName: jane.fullName,
            consentTextSnapshot: "Demo consent captured at seed.",
          },
        },
      },
    });

    await prisma.immunizationRecord.create({
      data: {
        appointmentId: appt.id,
        vaccineProductId: fluId,
        customerId: jane.id,
        administeredById: pharmacist.id,
        supervisingPharmacistId: pharmacist.id,
        patientName: jane.fullName,
        patientDob: jane.dateOfBirth,
        patientGender: "female",
        patientPhone: jane.phone,
        doseNumber: 1,
        seriesComplete: true,
        administeredAt: new Date("2026-08-10T07:15:00Z"),
        route: "IM",
        site: "Left deltoid",
        doseMl: 0.5,
        lotNumber: "FLU26-A441",
        expiryDate: new Date("2026-12-31"),
        manufacturer: "Seasonal supply",
        visGivenAt: new Date("2026-08-10T07:00:00Z"),
        visVersion: "2026-season",
        observationMinutes: 15,
        observationOutcome: "uneventful",
        nextDueDate: new Date("2027-03-01"),
        certificateCode: "IMU-202608-100001",
        campaignId: fluCampaign.id,
        notes: "Uneventful observation. Counselled on expected arm soreness.",
        status: "administered",
      },
    });

    await prisma.immunizationAppointment.update({
      where: { id: appt.id },
      data: { status: "completed" },
    });
  }

  await prisma.preventiveCounsellingSession.create({
    data: {
      pharmacyId: AETHER_ID,
      customerId: jane.id,
      counsellorId: pharmacist.id,
      topic: "diabetes_prevention",
      format: "in_person",
      durationMinutes: 25,
      patientName: jane.fullName,
      patientPhone: jane.phone,
      summary:
        "Discussed plate method, 30-minute daily walks, and pairing next flu dose with a fasting glucose check. Patient already on metformin — this session reinforced lifestyle, not a new diagnosis.",
      goals: ["Walk 30 minutes most days", "Reduce added salt", "Book quarterly screening"],
      resourcesGiven: ["Plate-method card", "Portal screening history"],
      status: "completed",
      source: "staff",
    },
  });

  console.log(`Seeded ${VACCINE_CATALOG.length} vaccine products, campaigns, credentials, and demo immunisation records.`);

  const planDefs = [
    { slug: "starter", name: "Starter", priceKes: 4999, sortOrder: 1, features: { staff: 2, branches: 1, messages: 500, ai: 50 } },
    { slug: "professional", name: "Professional", priceKes: 14999, sortOrder: 2, features: { staff: 10, branches: 3, messages: 5000, ai: 2000 } },
    { slug: "enterprise", name: "Enterprise", priceKes: 49999, sortOrder: 3, features: { staff: null, branches: null, messages: null, ai: null } },
  ] as const;
  for (const d of planDefs) {
    const plan = await prisma.plan.upsert({
      where: { slug: d.slug },
      update: { name: d.name, priceKes: d.priceKes, active: true, sortOrder: d.sortOrder },
      create: { slug: d.slug, name: d.name, priceKes: d.priceKes, interval: "monthly", active: true, sortOrder: d.sortOrder },
    });
    for (const [key, limitInt] of Object.entries(d.features)) {
      await prisma.planFeature.upsert({
        where: { planId_key: { planId: plan.id, key } },
        update: { enabled: true, limitInt },
        create: { planId: plan.id, key, enabled: true, limitInt },
      });
    }
  }
  for (const pharmacyId of [AETHER_ID, COAST_ID]) {
    const existingBranch = await prisma.pharmacyBranch.findFirst({ where: { pharmacyId, isDefault: true } });
    const branch = existingBranch ?? await prisma.pharmacyBranch.create({
      data: { pharmacyId, name: "Main Branch", code: "MAIN", isDefault: true },
    });
    await prisma.pharmacy.update({ where: { id: pharmacyId }, data: { defaultBranchId: branch.id } });
    const planSlug = pharmacyId === AETHER_ID ? "professional" : "starter";
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    const sub = await prisma.subscription.findFirst({ where: { pharmacyId } });
    if (!sub && plan) {
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 14 * 86400000);
      await prisma.subscription.create({
        data: {
          pharmacyId,
          planId: plan.id,
          status: "trialing",
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnds,
          trialEndsAt: trialEnds,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      pharmacyId: AETHER_ID,
      actorId: manager.id,
      action: "seed_completed",
      entityType: "system",
      details: { note: "Initial demo seed + services + categories + screenings" },
    },
  });

  console.log("Seed complete.");
  console.log("Demo accounts (password: Password123!):");
  console.log("  platform@aether.health        (super-admin → /platform)");
  console.log("  manager@aetherpharmacy.com    (Aether owner + Coast Care manager → /admin)");
  console.log("  pharmacist@aetherpharmacy.com (pharmacist)");
  console.log("  staff@aetherpharmacy.com      (staff)");
  console.log("  jane@example.com              (customer — linked to Aether + Coast Care)");
  console.log("  john@example.com              (customer)");
  console.log("  peter@example.com             (caregiver)");
}

withPlatformBypass(() => main())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
