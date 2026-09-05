import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canAccessAdminPath } from "../app/lib/platform/admin-access";
import type { SessionUser, PharmacyMemberRole } from "../app/lib/types";

function sessionFor(
  membershipRole: PharmacyMemberRole,
  opts?: { platformAdmin?: boolean; activePharmacyId?: string },
): SessionUser {
  const pharmacyId = opts?.activePharmacyId ?? "pharmacy-a";
  return {
    id: "user-1",
    email: "staff@example.test",
    role: membershipRole === "owner" ? "manager" : membershipRole,
    fullName: "Test Staff",
    customerId: null,
    platformAdmin: opts?.platformAdmin ?? false,
    platformRole: opts?.platformAdmin ? "super_admin" : "none",
    twoFactorEnabled: false,
    lastReauthAt: null,
    activePharmacyId: pharmacyId,
    memberships: [
      {
        id: "membership-1",
        pharmacyId,
        slug: "test-pharmacy",
        name: "Test Pharmacy",
        role: membershipRole,
        status: "active",
      },
    ],
  };
}

describe("admin route access", () => {
  it("keeps staff on operational commerce/customer surfaces", () => {
    const user = sessionFor("staff");

    assert.equal(canAccessAdminPath(user, "/admin"), true);
    assert.equal(canAccessAdminPath(user, "/admin/orders"), true);
    assert.equal(canAccessAdminPath(user, "/admin/inventory"), true);
    assert.equal(canAccessAdminPath(user, "/admin/customers/customer-1"), true);
    assert.equal(canAccessAdminPath(user, "/admin/inbox"), true);

    assert.equal(canAccessAdminPath(user, "/admin/prescriptions"), false);
    assert.equal(canAccessAdminPath(user, "/admin/analytics"), false);
    assert.equal(canAccessAdminPath(user, "/admin/settings/location"), false);
    assert.equal(canAccessAdminPath(user, "/admin/campaigns"), false);
    assert.equal(canAccessAdminPath(user, "/admin/medications/inventory-1"), false);
  });

  it("gives pharmacists clinical and reporting access without management access", () => {
    const user = sessionFor("pharmacist");

    assert.equal(canAccessAdminPath(user, "/admin/prescriptions"), true);
    assert.equal(canAccessAdminPath(user, "/admin/refills"), true);
    assert.equal(canAccessAdminPath(user, "/admin/screenings"), true);
    assert.equal(canAccessAdminPath(user, "/admin/analytics/revenue"), true);
    assert.equal(canAccessAdminPath(user, "/admin/messages"), true);

    assert.equal(canAccessAdminPath(user, "/admin/settings/location"), false);
    assert.equal(canAccessAdminPath(user, "/admin/settings/integrations"), false);
    assert.equal(canAccessAdminPath(user, "/admin/campaigns"), false);
    assert.equal(canAccessAdminPath(user, "/admin/medications/inventory-1"), false);
  });

  it("allows manager and owner memberships to reach management surfaces", () => {
    for (const role of ["manager", "owner"] as const) {
      const user = sessionFor(role);
      assert.equal(canAccessAdminPath(user, "/admin/settings/location"), true);
      assert.equal(canAccessAdminPath(user, "/admin/settings/integrations"), true);
      assert.equal(canAccessAdminPath(user, "/admin/campaigns"), true);
      assert.equal(canAccessAdminPath(user, "/admin/services"), true);
      assert.equal(canAccessAdminPath(user, "/admin/medications/inventory-1"), true);
    }
  });

  it("uses the active membership instead of privileges from another tenant", () => {
    const user = sessionFor("staff", { activePharmacyId: "pharmacy-b" });
    user.memberships.unshift({
      id: "membership-owner-a",
      pharmacyId: "pharmacy-a",
      slug: "owner-a",
      name: "Owner Pharmacy",
      role: "owner",
      status: "active",
    });

    assert.equal(canAccessAdminPath(user, "/admin/settings/location"), false);
    assert.equal(canAccessAdminPath(user, "/admin/orders"), true);
  });

  it("does not fall back to another tenant when the selected membership is stale", () => {
    const user = sessionFor("owner");
    user.activePharmacyId = "removed-pharmacy";

    assert.equal(canAccessAdminPath(user, "/admin"), false);
    assert.equal(canAccessAdminPath(user, "/admin/orders"), false);
    assert.equal(canAccessAdminPath(user, "/admin/settings/location"), false);
    assert.equal(canAccessAdminPath(user, "/admin/select"), true);
  });

  it("fails closed for undeclared admin surfaces", () => {
    const manager = sessionFor("manager");
    assert.equal(canAccessAdminPath(manager, "/admin/future-undeclared-feature"), false);
  });

  it("allows platform admins through tenant admin routes", () => {
    const user = sessionFor("staff", { platformAdmin: true });
    assert.equal(canAccessAdminPath(user, "/admin/settings/integrations"), true);
    assert.equal(canAccessAdminPath(user, "/admin/future-undeclared-feature"), true);
  });
});
