import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  requireStaff,
  requireManager,
  AuthError,
} from "../app/lib/auth";
import {
  createPrivateMediaToken,
  verifyPrivateMediaToken,
  getPrescriptionMediaViewUrl,
  storePrescriptionAttachment,
} from "../app/lib/r2";
import type { SessionUser } from "../app/lib/types";

function mockSession(opts?: {
  role?: string;
  twoFactorEnabled?: boolean;
  mfaVerifiedAt?: Date | null;
  platformAdmin?: boolean;
}): SessionUser {
  return {
    id: "user-test-1",
    email: "staff@afyvia.test",
    role: (opts?.role as any) ?? "pharmacist",
    fullName: "Test Staff",
    customerId: null,
    platformAdmin: opts?.platformAdmin ?? false,
    platformRole: opts?.platformAdmin ? "super_admin" : "none",
    twoFactorEnabled: opts?.twoFactorEnabled ?? false,
    mfaVerifiedAt: opts?.mfaVerifiedAt ?? null,
    lastReauthAt: null,
    activePharmacyId: "pharmacy-test-1",
    memberships: [
      {
        id: "mem-1",
        pharmacyId: "pharmacy-test-1",
        slug: "afyvia-westlands",
        name: "Afyvia Westlands",
        role: (opts?.role as any) ?? "pharmacist",
        status: "active",
      },
    ],
  };
}

describe("Staff 2FA / MFA Enforcement", () => {
  it("allows staff access when 2FA is disabled", () => {
    const user = mockSession({ twoFactorEnabled: false });
    const result = requireStaff(user);
    assert.equal(result.id, user.id);
  });

  it("blocks staff access with MFA_REQUIRED when 2FA is enabled but unverified", () => {
    const user = mockSession({ twoFactorEnabled: true, mfaVerifiedAt: null });
    assert.throws(
      () => requireStaff(user),
      (err: unknown) => {
        assert.ok(err instanceof AuthError);
        assert.equal(err.message, "MFA_REQUIRED");
        assert.equal(err.status, 401);
        return true;
      },
    );
  });

  it("allows staff access when 2FA is enabled and verified", () => {
    const user = mockSession({
      twoFactorEnabled: true,
      mfaVerifiedAt: new Date(),
    });
    const result = requireStaff(user);
    assert.equal(result.id, user.id);
  });

  it("blocks manager access with MFA_REQUIRED when 2FA is enabled but unverified", async () => {
    const user = mockSession({
      role: "manager",
      twoFactorEnabled: true,
      mfaVerifiedAt: null,
    });
    await assert.rejects(
      () => requireManager(user),
      (err: unknown) => {
        assert.ok(err instanceof AuthError);
        assert.equal(err.message, "MFA_REQUIRED");
        assert.equal(err.status, 401);
        return true;
      },
    );
  });
});

describe("Prescription Media Storage & Tokenization", () => {
  it("creates and verifies signed private media tokens for prescriptions", () => {
    process.env.AUTH_SECRET = "test-secret-long-enough-32-chars-at-least!";
    const reference = "r2-private://prescriptions/test-upload-123.jpg";
    const token = createPrivateMediaToken(reference);
    assert.ok(token && token.includes("."));

    const verified = verifyPrivateMediaToken(token);
    assert.ok(verified);
    assert.equal(verified?.key, "prescriptions/test-upload-123.jpg");
  });

  it("converts r2-private reference to /api/prescriptions/media url with token", () => {
    process.env.AUTH_SECRET = "test-secret-long-enough-32-chars-at-least!";
    const reference = "r2-private://prescriptions/script-456.png";
    const viewUrl = getPrescriptionMediaViewUrl(reference);
    assert.ok(viewUrl.startsWith("/api/prescriptions/media?token="));
    assert.ok(viewUrl.includes("ey"));
  });

  it("leaves standard HTTPS and data URLs untouched in getPrescriptionMediaViewUrl", () => {
    const httpsUrl = "https://example.com/prescription.jpg";
    assert.equal(getPrescriptionMediaViewUrl(httpsUrl), httpsUrl);

    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    assert.equal(getPrescriptionMediaViewUrl(dataUrl), dataUrl);
  });

  it("falls back gracefully when R2 is not configured in storePrescriptionAttachment", async () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const stored = await storePrescriptionAttachment(dataUrl);
    // When R2 is not configured, returns the original data URL
    assert.equal(stored, dataUrl);
  });

  it("leaves non-data URLs untouched in storePrescriptionAttachment", async () => {
    const regularUrl = "https://example.com/photo.png";
    const stored = await storePrescriptionAttachment(regularUrl);
    assert.equal(stored, regularUrl);
  });
});

describe("Dispensary Refill Accounting & Inventory", () => {
  it("exports fulfillRefillInventory and fulfillRefillRequest", async () => {
    const { fulfillRefillInventory, fulfillRefillRequest } = await import(
      "../app/lib/services/crm"
    );
    assert.equal(typeof fulfillRefillInventory, "function");
    assert.equal(typeof fulfillRefillRequest, "function");
    assert.equal(fulfillRefillInventory, fulfillRefillRequest);
  });
});
