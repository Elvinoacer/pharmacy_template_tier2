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
      imageUrl: "/images/services/prescription-dispensing.webp",
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
      imageUrl: "/images/gallery/welcoming_retail_floor.webp",
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
      imageUrl: "/images/services/medication-counselling.webp",
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
      imageUrl: "/images/articles/understanding-blood-pressure.webp",
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
      imageUrl: "/images/articles/diabetes-everyday-tips.webp",
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
      imageUrl: "/images/articles/nutrition-basics-for-heart-health.webp",
      icon: "shield",
      price: 1500,
      sortOrder: 60,
    },
    {
      slug: "health-screenings",
      title: "Health Screenings",
      short: "Cholesterol, blood glucose, BMI, and wellness checks close to home.",
      description:
        "Quick screenings help catch concerns early. Ask about our monthly wellness clinic days for expanded checks and health education.",
      benefits: [
        "Cholesterol and glucose checks",
        "BMI and waist measurements",
        "Results explained clearly",
        "Physician referral when indicated",
      ],
      eligibility: "Adults; some screenings may have a modest fee.",
      duration: "15–25 minutes.",
      imageUrl: "/images/gallery/modern_care_tools.webp",
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
      imageUrl: "/images/services/delivery-services.webp",
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
      imageUrl: "/images/services/home-care-support.webp",
      icon: "home",
      price: 2000,
      sortOrder: 90,
    },
  ];

  for (const s of serviceSeeds) {
    await prisma.pharmacyService.create({
      data: {
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
      imageUrl: "/images/otc/pain-relief.webp",
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
      imageUrl: "/images/otc/cold-flu.webp",
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
      imageUrl: "/images/articles/seasonal-allergy-guide.webp",
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
      imageUrl: "/images/services/medication-counselling.webp",
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
      imageUrl: "/images/otc/first-aid.webp",
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
      imageUrl: "/images/otc/skin-care.webp",
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
      imageUrl: "/images/otc/skin-care.webp",
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
      imageUrl: "/images/gallery/careful_dispensing.webp",
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
      imageUrl: "/images/otc/first-aid.webp",
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
      imageUrl: "/images/gallery/welcoming_retail_floor.webp",
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
      imageUrl: "/images/otc/womens-health.webp",
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
      imageUrl: "/images/otc/baby-care.webp",
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
      imageUrl: "/images/gallery/modern_care_tools.webp",
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
      imageUrl: "/images/otc/vitamins-supplements.webp",
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
    { slug: "allergy", name: "Allergy", description: "Allergy and hay fever treatments.", imageUrl: "/images/articles/seasonal-allergy-guide.webp", brands: ["Zyrtec", "Clarityn"], tips: ["Non-drowsy options available."], sortOrder: 35 },
    { slug: "digestive", name: "Digestive", description: "Digestive therapies.", imageUrl: "/images/services/medication-counselling.webp", brands: ["Gaviscon", "Imodium"], tips: ["Hydration is key."], sortOrder: 45 },
    { slug: "womens-health", name: "Women's Health", description: "Reproductive health and wellness.", imageUrl: "/images/otc/womens-health.webp", brands: ["Always", "Pregnacare"], tips: ["Discreet counselling available."], sortOrder: 115 },
    { slug: "diabetes-care", name: "Diabetes Care", description: "Meters, strips, and glucose care.", imageUrl: "/images/articles/diabetes-everyday-tips.webp", brands: ["OneTouch", "Accu-Chek"], tips: ["Store test strips in a cool dry place."], sortOrder: 135 },
    { slug: "vitamins-supplements", name: "Vitamins & Supplements", description: "Vitamins and nutritional supplements.", imageUrl: "/images/otc/vitamins-supplements.webp", brands: ["Nature Made", "Centrum"], tips: ["Ask about interactions."], sortOrder: 145 },
    { slug: "antibiotics", name: "Antibiotics", description: "Prescription antibacterials.", imageUrl: "", brands: [], tips: [], sortOrder: 200 },
    { slug: "cardiovascular", name: "Cardiovascular", description: "Heart and blood pressure therapies.", imageUrl: "", brands: [], tips: [], sortOrder: 210 },
    { slug: "diabetes", name: "Diabetes", description: "Diabetes prescription therapies.", imageUrl: "/images/articles/diabetes-everyday-tips.webp", brands: [], tips: [], sortOrder: 220 },
    { slug: "respiratory", name: "Respiratory", description: "Asthma, COPD, and breathing support.", imageUrl: "", brands: [], tips: [], sortOrder: 230 },
    { slug: "vitamins", name: "Vitamins", description: "Clinical vitamin catalogue.", imageUrl: "/images/otc/vitamins-supplements.webp", brands: [], tips: [], sortOrder: 240 },
  ];

  for (const c of categorySeeds) {
    await prisma.medicationCategory.upsert({
      where: { slug: c.slug },
      create: {
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

  console.log(`Upserted ${categorySeeds.length} medication categories.`);

  await prisma.auditLog.create({
    data: {
      actorId: manager.id,
      action: "seed_completed",
      entityType: "system",
      details: { note: "Initial demo seed + services + categories" },
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
