import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolvePharmacyOnboardingStage,
  resolveActiveJourneyView,
  getChapterForStage,
  parseStageAlias,
  type PharmacyOnboardingSnapshot,
} from "../app/lib/services/pharmacy-onboarding-journey";

function createMockSnapshot(overrides: Partial<PharmacyOnboardingSnapshot> = {}): PharmacyOnboardingSnapshot {
  const base: PharmacyOnboardingSnapshot = {
    user: {
      id: "user-123",
      email: "owner@pharmacy.co.ke",
      emailVerified: true,
      fullName: "Dr. Jane Mwangi",
    },
    pharmacy: {
      id: "pharm-123",
      slug: "coast-care",
      name: "Coast Care Pharmacy",
      legalName: "Coast Care Ltd",
      tagline: "Care close to home",
      description: "Community chemist serving Kilifi patients with genuine medicines.",
      licenseNumber: "PPB/PREM/2024/9999",
      licenseDocumentUrl: "r2-private://pharmacy-verification/pharm-123/license/lic.jpg",
      ppbPremisesNumber: "PPB/PREM/2024/9999",
      kraPin: "P051234567Z",
      status: "draft",
      listed: false,
      verificationNotes: null,
      rejectionReason: null,
      verifiedAt: null,
      submittedAt: null,
      goLiveAt: null,
      setupCompletedAt: null,
      email: "hello@coastcare.co.ke",
      phone: "+254712345678",
      whatsapp: "+254712345678",
      city: "Kilifi",
      county: "Kilifi",
      country: "Kenya",
      latitude: -3.6305,
      longitude: 39.8499,
    },
    verificationProfile: {
      facilityType: "Retail Pharmacy / Community Chemist",
      physicalAddress: "Ground Floor, Biashara Street",
      licenseExpiryDate: "2026-12-31",
      licenseQrPayload: null,
      superintendentName: "Dr. Jane Mwangi",
      superintendentRegistrationNumber: "REG-5544",
      superintendentPracticeLicenseNumber: "PL-2026-1234",
      ownershipType: "Sole Proprietorship",
      businessRegistrationNumber: "BN-998877",
      businessDocumentUrl: "r2-private://pharmacy-verification/pharm-123/business/reg.jpg",
      applicantAuthorityConfirmed: true,
      declaredAt: "2026-09-01T00:00:00Z",
    },
    documentDrafts: {
      license: {
        reference: "r2-private://pharmacy-verification/pharm-123/license/lic.jpg",
        contentType: "image/jpeg",
        size: 102400,
        createdAt: new Date(),
      },
      business: {
        reference: "r2-private://pharmacy-verification/pharm-123/business/reg.jpg",
        contentType: "image/jpeg",
        size: 204800,
        createdAt: new Date(),
      },
    },
    verificationPayment: {
      paid: true,
      waived: false,
      totalKes: 100,
      invoiceId: "inv-123",
      invoiceNumber: "KYP-pharm-123",
      status: "paid",
      hasPrepaidBundleCredit: false,
      isBundlePaid: false,
    },
    promotionGrant: null,
    readiness: {
      ready: true,
      missing: [],
      profile: null,
      profileEventCreatedAt: null,
    },
    setup: {
      hoursOk: true,
      medicinesOk: true,
      servicesOk: true,
      profileOk: true,
      subscriptionOk: true,
      counts: { medicines: 5, services: 2 },
      medicineDeferred: false,
      ready: true,
    },
    subscription: {
      active: true,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    },
  };

  return {
    ...base,
    ...overrides,
    pharmacy: overrides.pharmacy === null ? null : { ...base.pharmacy!, ...(overrides.pharmacy || {}) },
    user: overrides.user === null ? null : { ...base.user!, ...(overrides.user || {}) },
    verificationProfile:
      overrides.verificationProfile === null
        ? null
        : { ...base.verificationProfile!, ...(overrides.verificationProfile || {}) },
    verificationPayment: { ...base.verificationPayment, ...(overrides.verificationPayment || {}) },
    setup: overrides.setup === null ? null : { ...base.setup!, ...(overrides.setup || {}) },
    subscription: overrides.subscription === null ? null : { ...base.subscription!, ...(overrides.subscription || {}) },
  };
}

describe("Pharmacy Onboarding State Machine & Journey Architecture", () => {
  describe("1. Canonical Stage Resolution from Persisted Facts", () => {
    it("resolves ACCOUNT when user is not logged in", () => {
      const snapshot = createMockSnapshot({ user: null });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "ACCOUNT");
    });

    it("resolves ACCOUNT when logged in user has no pharmacy draft yet", () => {
      const snapshot = createMockSnapshot({ pharmacy: null });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "ACCOUNT");
    });

    it("resolves EMAIL_VERIFICATION when user email is unverified", () => {
      const snapshot = createMockSnapshot({
        user: { id: "u-1", email: "test@example.com", emailVerified: false, fullName: "User" },
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "EMAIL_VERIFICATION");
    });

    it("resolves PHARMACY_DETAILS when phone is missing", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { phone: null } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "PHARMACY_DETAILS");
    });

    it("resolves PHARMACY_DETAILS when city is missing", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { city: null } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "PHARMACY_DETAILS");
    });

    it("resolves PHARMACY_DETAILS when premises GPS coordinates are missing or invalid", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { latitude: null, longitude: null } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "PHARMACY_DETAILS");
    });

    it("resolves VERIFICATION_INFORMATION when verification profile is missing", () => {
      const snapshot = createMockSnapshot({
        verificationProfile: null,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "VERIFICATION_INFORMATION");
    });

    it("resolves VERIFICATION_INFORMATION when authority declaration is false", () => {
      const snapshot = createMockSnapshot({
        verificationProfile: { applicantAuthorityConfirmed: false } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "VERIFICATION_INFORMATION");
    });

    it("resolves VERIFICATION_PAYMENT when fee is unpaid and unwaived", () => {
      const snapshot = createMockSnapshot({
        verificationPayment: {
          paid: false,
          waived: false,
          totalKes: 100,
          invoiceId: "inv-1",
          invoiceNumber: "KYP-1",
          status: "open",
          hasPrepaidBundleCredit: false,
          isBundlePaid: false,
        },
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "VERIFICATION_PAYMENT");
    });

    it("resolves FINAL_REVIEW when fee is paid normally", () => {
      const snapshot = createMockSnapshot();
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "FINAL_REVIEW");
    });

    it("resolves FINAL_REVIEW when fee is waived by promotion", () => {
      const snapshot = createMockSnapshot({
        verificationPayment: {
          paid: false,
          waived: true,
          totalKes: 0,
          invoiceId: "inv-1",
          invoiceNumber: "KYP-1",
          status: "paid",
          hasPrepaidBundleCredit: false,
          isBundlePaid: false,
        },
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "FINAL_REVIEW");
    });

    it("resolves FINAL_REVIEW when KES 600 bundle is paid", () => {
      const snapshot = createMockSnapshot({
        verificationPayment: {
          paid: true,
          waived: false,
          totalKes: 600,
          invoiceId: "bundle-1",
          invoiceNumber: "BUNDLE-pharm-123",
          status: "paid",
          hasPrepaidBundleCredit: true,
          isBundlePaid: true,
        },
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "FINAL_REVIEW");
    });

    it("resolves AWAITING_ADMIN_REVIEW when status is submitted", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { status: "submitted" } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "AWAITING_ADMIN_REVIEW");
    });

    it("resolves AWAITING_ADMIN_REVIEW when status is under_review", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { status: "under_review" } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "AWAITING_ADMIN_REVIEW");
    });

    it("resolves NEEDS_INFORMATION when status is needs_info", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { status: "needs_info", verificationNotes: "Please re-upload clearer licence." } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "NEEDS_INFORMATION");
    });

    it("resolves REJECTED when status is rejected", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { status: "rejected", rejectionReason: "Non-compliant facility." } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "REJECTED");
    });

    it("resolves POST_APPROVAL_SETUP when approved but opening hours incomplete", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { status: "approved", verifiedAt: new Date() } as any,
        setup: { hoursOk: false, medicinesOk: true, servicesOk: true, profileOk: true } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "POST_APPROVAL_SETUP");
    });

    it("resolves POST_APPROVAL_SETUP when approved but services incomplete", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { status: "approved", verifiedAt: new Date() } as any,
        setup: { hoursOk: true, medicinesOk: true, servicesOk: false, profileOk: true } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "POST_APPROVAL_SETUP");
    });

    it("resolves POST_APPROVAL_SETUP when medicines choice deferred (ok to proceed)", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { status: "approved", verifiedAt: new Date() } as any,
        setup: { hoursOk: true, medicinesOk: true, servicesOk: true, profileOk: false, medicineDeferred: true } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "POST_APPROVAL_SETUP");
    });

    it("resolves SERVICE_ACTIVATION when storefront setup complete but subscription inactive", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { status: "approved", verifiedAt: new Date() } as any,
        setup: { hoursOk: true, medicinesOk: true, servicesOk: true, profileOk: true } as any,
        subscription: { active: false, status: null, currentPeriodEnd: null },
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "SERVICE_ACTIVATION");
    });

    it("resolves READY_TO_LAUNCH when storefront setup complete and subscription active", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { status: "approved", verifiedAt: new Date() } as any,
        setup: { hoursOk: true, medicinesOk: true, servicesOk: true, profileOk: true } as any,
        subscription: { active: true, status: "active", currentPeriodEnd: new Date(Date.now() + 86400000) },
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "READY_TO_LAUNCH");
    });

    it("resolves COMPLETE when pharmacy is active, listed, and setupCompletedAt is recorded", () => {
      const snapshot = createMockSnapshot({
        pharmacy: {
          status: "active",
          listed: true,
          setupCompletedAt: new Date(),
          verifiedAt: new Date(),
        } as any,
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "COMPLETE");
    });
  });

  describe("2. Navigation and Prerequisite Guarding (resolveActiveJourneyView)", () => {
    it("blocks skipping forward to payment when email is unverified", () => {
      const snapshot = createMockSnapshot({
        user: { id: "u-1", email: "test@example.com", emailVerified: false, fullName: "User" },
      });
      const view = resolveActiveJourneyView(snapshot, "payment");
      assert.equal(view.stage, "EMAIL_VERIFICATION", "Must redirect to EMAIL_VERIFICATION");
      assert.equal(view.isReviewEdit, false);
    });

    it("blocks skipping forward to review when location details are missing", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { phone: null } as any,
      });
      const view = resolveActiveJourneyView(snapshot, "review");
      assert.equal(view.stage, "PHARMACY_DETAILS", "Must force PHARMACY_DETAILS");
    });

    it("allows editing earlier stages when in FINAL_REVIEW", () => {
      const snapshot = createMockSnapshot(); // authoritative stage is FINAL_REVIEW
      const view = resolveActiveJourneyView(snapshot, "details");
      assert.equal(view.stage, "PHARMACY_DETAILS");
      assert.equal(view.isReviewEdit, true, "isReviewEdit flag should be true");

      const verifView = resolveActiveJourneyView(snapshot, "verification");
      assert.equal(verifView.stage, "VERIFICATION_INFORMATION");
      assert.equal(verifView.isReviewEdit, true);
    });

    it("allows editing details when application is in NEEDS_INFORMATION", () => {
      const snapshot = createMockSnapshot({
        pharmacy: { status: "needs_info", verificationNotes: "Update licence" } as any,
      });
      const view = resolveActiveJourneyView(snapshot, "verification");
      assert.equal(view.stage, "VERIFICATION_INFORMATION");
      assert.equal(view.isReviewEdit, true, "isReviewEdit must be true during NEEDS_INFORMATION");

      const detailsView = resolveActiveJourneyView(snapshot, "details");
      assert.equal(detailsView.stage, "PHARMACY_DETAILS");
      assert.equal(detailsView.isReviewEdit, true, "isReviewEdit must be true for details in NEEDS_INFORMATION");
    });

    it("allows bundle-paid applicant to advance to FINAL_REVIEW without separate KYP invoice", () => {
      const snapshot = createMockSnapshot({
        verificationPayment: {
          paid: true,
          waived: false,
          totalKes: 600,
          invoiceId: "inv-bundle",
          invoiceNumber: "BUNDLE-pharm-123",
          status: "paid",
          hasPrepaidBundleCredit: true,
          isBundlePaid: true,
        },
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "FINAL_REVIEW");
    });

    it("allows promo-waived applicant to advance to FINAL_REVIEW with zero fee", () => {
      const snapshot = createMockSnapshot({
        verificationPayment: {
          paid: false,
          waived: true,
          totalKes: 0,
          invoiceId: "inv-kyp",
          invoiceNumber: "KYP-pharm-123",
          status: "paid",
          hasPrepaidBundleCredit: false,
          isBundlePaid: false,
        },
        promotionGrant: {
          verification: true,
          recurringMonths: 1,
          promotionName: "Grand Opening Promo",
          promotionCode: "OPEN2026",
        },
      });
      assert.equal(resolvePharmacyOnboardingStage(snapshot), "FINAL_REVIEW");
    });

    it("correctly parses stage aliases", () => {
      assert.equal(parseStageAlias("account"), "ACCOUNT");
      assert.equal(parseStageAlias("email"), "EMAIL_VERIFICATION");
      assert.equal(parseStageAlias("details"), "PHARMACY_DETAILS");
      assert.equal(parseStageAlias("premises"), "PHARMACY_DETAILS");
      assert.equal(parseStageAlias("verification"), "VERIFICATION_INFORMATION");
      assert.equal(parseStageAlias("dossier"), "VERIFICATION_INFORMATION");
      assert.equal(parseStageAlias("payment"), "VERIFICATION_PAYMENT");
      assert.equal(parseStageAlias("billing"), "VERIFICATION_PAYMENT");
      assert.equal(parseStageAlias("review"), "FINAL_REVIEW");
      assert.equal(parseStageAlias("setup"), "POST_APPROVAL_SETUP");
      assert.equal(parseStageAlias("activate"), "SERVICE_ACTIVATION");
      assert.equal(parseStageAlias("launch"), "READY_TO_LAUNCH");
    });
  });

  describe("3. Chapter Progression & Terminology", () => {
    it("maps every stage to its logical parent chapter", () => {
      assert.equal(getChapterForStage("ACCOUNT"), "account");
      assert.equal(getChapterForStage("EMAIL_VERIFICATION"), "account");
      assert.equal(getChapterForStage("PHARMACY_DETAILS"), "pharmacy");
      assert.equal(getChapterForStage("VERIFICATION_INFORMATION"), "verification");
      assert.equal(getChapterForStage("VERIFICATION_PAYMENT"), "verification");
      assert.equal(getChapterForStage("FINAL_REVIEW"), "verification");
      assert.equal(getChapterForStage("AWAITING_ADMIN_REVIEW"), "review");
      assert.equal(getChapterForStage("NEEDS_INFORMATION"), "review");
      assert.equal(getChapterForStage("REJECTED"), "review");
      assert.equal(getChapterForStage("POST_APPROVAL_SETUP"), "launch");
      assert.equal(getChapterForStage("SERVICE_ACTIVATION"), "launch");
      assert.equal(getChapterForStage("READY_TO_LAUNCH"), "launch");
      assert.equal(getChapterForStage("COMPLETE"), "launch");
    });
  });
});
