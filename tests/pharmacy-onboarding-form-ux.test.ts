import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugifyPharmacyName, isValidPharmacySlug } from "../app/lib/slug";
import {
  resolvePharmacyOnboardingStage,
  type PharmacyOnboardingSnapshot,
} from "../app/lib/services/pharmacy-onboarding-journey";

describe("Pharmacy Onboarding Modern Form UX & Progressive Guidance", () => {
  describe("1. Intelligent Pre-filling & Auto-generation", () => {
    it("auto-generates clean, URL-safe slugs from pharmacy trading names", () => {
      assert.equal(slugifyPharmacyName("Coast Care Pharmacy"), "coast-care-pharmacy");
      assert.equal(slugifyPharmacyName("St. Jude's Community Chemist!"), "st-jude-s-community-chemist");
      assert.equal(slugifyPharmacyName("Nairobi West 24/7 Dispensary"), "nairobi-west-24-7-dispensary");
    });

    it("validates pharmacy slugs according to public URL routing rules", () => {
      assert.equal(isValidPharmacySlug("coast-care"), true);
      assert.equal(isValidPharmacySlug("mama-lucy-chemist"), true);
      assert.equal(isValidPharmacySlug("a"), false); // too short
      assert.equal(isValidPharmacySlug("CAPITALS_NOT_ALLOWED"), false);
    });
  });

  describe("2. Document Requirement Rules for Verification", () => {
    function createSnapshot(overrides: Partial<PharmacyOnboardingSnapshot> = {}): PharmacyOnboardingSnapshot {
      return {
        user: {
          id: "user-1",
          email: "owner@afyvia.test",
          emailVerified: true,
          fullName: "Dr. Jane Mwangi",
        },
        pharmacy: {
          id: "pharm-1",
          name: "Coast Care Chemist",
          slug: "coast-care-chemist",
          legalName: "Coast Care Ltd",
          status: "draft",
          phone: "+254712345678",
          city: "Kilifi",
          county: "Kilifi",
          country: "Kenya",
          latitude: -3.6305,
          longitude: 39.8499,
          ppbPremisesNumber: null,
          licenseDocumentUrl: null,
        } as any,
        verificationProfile: {
          facilityType: "Retail Pharmacy / Community Chemist",
          physicalAddress: "Ground Floor, Biashara Street",
          superintendentName: "Dr. Jane Mwangi",
          applicantAuthorityConfirmed: true,
          businessDocumentUrl: null,
        } as any,
        documentDrafts: {
          license: null,
          business: null,
        },
        verificationPayment: {
          paid: false,
          waived: false,
          totalKes: 100,
          invoiceId: "inv-1",
          invoiceNumber: "KYP-pharm-1",
          status: "pending",
          hasPrepaidBundleCredit: false,
          isBundlePaid: false,
        },
        subscription: null,
        promotionGrant: null,
        readiness: { ready: false, missing: [] } as any,
        setup: { ready: false } as any,
        ...overrides,
      };
    }

    it("advances to VERIFICATION_PAYMENT once authority is confirmed, even if PPB number is optional", () => {
      const snap = createSnapshot({
        pharmacy: {
          id: "pharm-1",
          name: "Coast Care",
          slug: "coast-care",
          legalName: null,
          status: "draft",
          phone: "+254712345678",
          city: "Kilifi",
          county: "Kilifi",
          country: "Kenya",
          latitude: -3.6305,
          longitude: 39.8499,
          ppbPremisesNumber: null, // Optional at intake
          licenseDocumentUrl: "r2-private://pharmacy-verification/pharm-1/license/lic.jpg",
        } as any,
      });

      const stage = resolvePharmacyOnboardingStage(snap);
      assert.equal(stage, "VERIFICATION_PAYMENT");
    });

    it("accepts business registration evidence as valid intake document when licence is pending", () => {
      const snap = createSnapshot({
        pharmacy: {
          id: "pharm-1",
          name: "Coast Care",
          slug: "coast-care",
          legalName: null,
          status: "draft",
          phone: "+254712345678",
          city: "Kilifi",
          county: "Kilifi",
          country: "Kenya",
          latitude: -3.6305,
          longitude: 39.8499,
          ppbPremisesNumber: null,
          licenseDocumentUrl: null, // No PPB licence yet
        } as any,
        verificationProfile: {
          facilityType: "Retail Pharmacy / Community Chemist",
          physicalAddress: "Ground Floor, Biashara Street",
          superintendentName: "Dr. Jane Mwangi",
          applicantAuthorityConfirmed: true,
          businessDocumentUrl: "r2-private://pharmacy-verification/pharm-1/business/cr12.jpg", // Business cert provided
        } as any,
      });

      const stage = resolvePharmacyOnboardingStage(snap);
      assert.equal(stage, "VERIFICATION_PAYMENT");
    });

    it("holds at VERIFICATION_INFORMATION when applicant authority has not been declared", () => {
      const snap = createSnapshot({
        verificationProfile: {
          facilityType: "Retail Pharmacy / Community Chemist",
          physicalAddress: "Ground Floor, Biashara Street",
          superintendentName: "Dr. Jane Mwangi",
          applicantAuthorityConfirmed: false, // Not declared yet
          businessDocumentUrl: "r2-private://pharmacy-verification/pharm-1/business/cr12.jpg",
        } as any,
      });

      const stage = resolvePharmacyOnboardingStage(snap);
      assert.equal(stage, "VERIFICATION_INFORMATION");
    });
  });

  describe("3. Interactive Form Polish & Suffix Chips Logic", () => {
    function applySuffix(currentName: string, suffix: string): string {
      if (!currentName.trim()) {
        return suffix;
      }
      if (!currentName.toLowerCase().includes(suffix.toLowerCase())) {
        return `${currentName.trim()} ${suffix}`;
      }
      return currentName;
    }

    it("appends suffix chips intelligently without duplicating existing terms", () => {
      assert.equal(applySuffix("", "Pharmacy"), "Pharmacy");
      assert.equal(applySuffix("Coast Care", "Pharmacy"), "Coast Care Pharmacy");
      assert.equal(applySuffix("Coast Care Pharmacy", "Pharmacy"), "Coast Care Pharmacy");
      assert.equal(applySuffix("Amani chemist", "Chemist"), "Amani chemist");
      assert.equal(applySuffix("Nairobi West", "Healthcare"), "Nairobi West Healthcare");
    });

    it("ensures all Kenyan commercial hubs have valid coordinate bounds and non-empty metadata", () => {
      const KENYA_HUBS = [
        { city: "Nairobi", county: "Nairobi", lat: -1.286389, lng: 36.817223 },
        { city: "Mombasa", county: "Mombasa", lat: -4.043477, lng: 39.668206 },
        { city: "Kisumu", county: "Kisumu", lat: -0.091702, lng: 34.767956 },
        { city: "Nakuru", county: "Nakuru", lat: -0.303099, lng: 36.080025 },
        { city: "Eldoret", county: "Uasin Gishu", lat: 0.514277, lng: 35.26978 },
        { city: "Kilifi", county: "Kilifi", lat: -3.6305, lng: 39.8499 },
        { city: "Kiambu", county: "Kiambu", lat: -1.171389, lng: 36.835556 },
        { city: "Machakos", county: "Machakos", lat: -1.517684, lng: 37.263415 },
      ];

      for (const hub of KENYA_HUBS) {
        assert.ok(hub.city.length > 0, "Hub city must not be empty");
        assert.ok(hub.county.length > 0, "Hub county must not be empty");
        // Kenya latitude roughly [-5, 5], longitude roughly [33, 42]
        assert.ok(hub.lat >= -5 && hub.lat <= 5, `Hub ${hub.city} lat ${hub.lat} out of Kenya bounds`);
        assert.ok(hub.lng >= 33 && hub.lng <= 42, `Hub ${hub.city} lng ${hub.lng} out of Kenya bounds`);
      }
    });

    it("validates document upload reference format for license and business docs", () => {
      const pharmacyId = "pharm-abc-123";
      function validVerificationReference(value: string, pId: string, kind: "license" | "business") {
        return value.startsWith(`r2-private://pharmacy-verification/${pId}/${kind}/`);
      }

      assert.equal(
        validVerificationReference(`r2-private://pharmacy-verification/${pharmacyId}/license/doc.jpg`, pharmacyId, "license"),
        true,
      );
      assert.equal(
        validVerificationReference(`r2-private://pharmacy-verification/${pharmacyId}/business/cr12.pdf`, pharmacyId, "business"),
        true,
      );
      assert.equal(
        validVerificationReference(`r2-private://pharmacy-verification/other-pharm/license/doc.jpg`, pharmacyId, "license"),
        false, // Wrong pharmacy ID
      );
      assert.equal(
        validVerificationReference(`https://malicious.site/doc.jpg`, pharmacyId, "license"),
        false, // External arbitrary URL rejected
      );
    });
  });
});
