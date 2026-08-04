import path from "node:path";
import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConfig } from "../app/lib/db/config";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seeding");
}

const adapter = new PrismaPg(buildPostgresConfig(connectionString));
const prisma = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("Seeding Tier 2 Customer Engagement Platform…");

  await prisma.aiMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.customerNote.deleteMany();
  await prisma.customerSegment.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.refillRequest.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.caregiver.deleteMany();
  await prisma.customerPreference.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash("Password123!");

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
        data: { ...s, createdById: manager.id },
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
      prescriptionId: metformin.id,
      customerId: jane.id,
      timeOfDay: "08:00",
      label: "Morning",
      active: true,
    },
  });
  const metforminScheduleEvening = await prisma.medicationSchedule.create({
    data: {
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

  await prisma.coupon.createMany({
    data: [
      {
        code: "WELLNESS10",
        description: "10% off wellness products",
        discountType: "percent",
        discountValue: 10,
        pointsCost: 100,
        maxRedemptions: 500,
      },
      {
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
        customerId: jane.id,
        userId: customerUser.id,
        eventType: "registered",
        title: "Account registered",
        description: "Jane created an online account",
        createdById: customerUser.id,
      },
      {
        customerId: jane.id,
        eventType: "refill_submitted",
        title: "Refill requested",
        description: "Metformin 500mg — under review",
        metadata: { refillId: refill.id },
        createdById: customerUser.id,
      },
      {
        customerId: jane.id,
        eventType: "reminder_sent",
        title: "Refill reminder sent",
        description: "WhatsApp reminder for Metformin",
        createdById: staff.id,
      },
      {
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
        name: "Refill ready for pickup",
        channel: "sms",
        body: "Hi {{name}}, your prescription {{medicine}} is ready for pickup at Aether Pharmacy.",
        category: "refill",
        createdById: manager.id,
      },
      {
        name: "Refill reminder",
        channel: "whatsapp",
        body: "Hi {{name}}, your {{medicine}} may be running low. Reply REFILL or open your portal to request.",
        category: "reminder",
        createdById: manager.id,
      },
      {
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
        title: "Insurance accepted",
        category: "store",
        content:
          "We accept major plans including Blue Cross Blue Shield, Aetna, UnitedHealthcare, Cigna, Medicare, Medicaid, Humana, and most major plans.",
        tags: ["insurance"],
        priority: 70,
        isApproved: true,
        createdById: manager.id,
      },
    ],
  });

  await prisma.customerNote.create({
    data: {
      customerId: jane.id,
      authorId: pharmacist.id,
      body: "Prefers WhatsApp updates. Counselled on metformin with meals.",
      isPinned: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: manager.id,
      action: "seed_completed",
      entityType: "system",
      details: { note: "Initial demo seed" },
    },
  });

  console.log("Seed complete.");
  console.log("Demo accounts (password: Password123!):");
  console.log("  manager@aetherpharmacy.com   (manager)");
  console.log("  pharmacist@aetherpharmacy.com (pharmacist)");
  console.log("  staff@aetherpharmacy.com      (staff)");
  console.log("  jane@example.com              (customer)");
  console.log("  john@example.com              (customer)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
