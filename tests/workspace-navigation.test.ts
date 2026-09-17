import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WORKSPACE_DESTINATIONS,
  canAccessDestination,
  getWorkspaceGroups,
  getDestinationForPath,
  getContextualActions,
  searchWorkspace,
  getDestinationLoadingInfo,
  type WorkspaceRole,
} from "../app/lib/navigation/workspace-registry";
import type { SessionUser, PharmacyMemberRole } from "../app/lib/types";

function mockSession(
  membershipRole: PharmacyMemberRole,
  opts?: { platformAdmin?: boolean; activePharmacyId?: string; isCustomer?: boolean; isCaregiver?: boolean },
): SessionUser {
  const pharmacyId = opts?.activePharmacyId ?? "pharmacy-test";
  return {
    id: "user-1",
    email: "worker@example.test",
    role: opts?.isCaregiver ? "caregiver" : opts?.isCustomer ? "customer" : membershipRole === "owner" ? "manager" : membershipRole,
    fullName: "Test User",
    customerId: opts?.isCustomer ? "cust-1" : null,
    platformAdmin: opts?.platformAdmin ?? false,
    platformRole: opts?.platformAdmin ? "super_admin" : "none",
    twoFactorEnabled: true,
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

describe("Aether Command Workspace Navigation Architecture", () => {
  describe("1. Workspace Group Hierarchy & Rail Boundaries", () => {
    const roles: WorkspaceRole[] = ["admin", "platform", "portal", "caregiver"];

    it("restricts each role rail to 5–6 high-level workspaces with no vertical scrolling required", () => {
      for (const role of roles) {
        const groups = getWorkspaceGroups(role);
        assert.ok(
          groups.length >= 5 && groups.length <= 6,
          `Role ${role} should have between 5 and 6 workspace groups, got ${groups.length}`
        );

        // Every group must have valid metadata
        for (const g of groups) {
          assert.ok(g.id && g.id.length > 0, `Group in ${role} missing id`);
          assert.ok(g.label && g.label.length > 0, `Group ${g.id} in ${role} missing label`);
          assert.ok(g.shortLabel && g.shortLabel.length > 0, `Group ${g.id} in ${role} missing shortLabel`);
          assert.ok(g.icon && g.icon.length > 0, `Group ${g.id} in ${role} missing icon`);
          assert.equal(g.role, role);
        }
      }
    });

    it("Admin groups follow required conceptual architecture", () => {
      const adminGroups = getWorkspaceGroups("admin").map((g) => g.id);
      assert.deepEqual(adminGroups, ["today", "clinical", "stock", "patients", "insights", "more"]);
    });

    it("Platform groups follow required conceptual architecture", () => {
      const platformGroups = getWorkspaceGroups("platform").map((g) => g.id);
      assert.deepEqual(platformGroups, ["overview", "network", "operations", "governance", "system"]);
    });

    it("Portal groups follow required conceptual architecture", () => {
      const portalGroups = getWorkspaceGroups("portal").map((g) => g.id);
      assert.deepEqual(portalGroups, ["home", "medicines", "care", "orders", "messages", "more"]);
    });

    it("Caregiver groups follow required conceptual architecture", () => {
      const caregiverGroups = getWorkspaceGroups("caregiver").map((g) => g.id);
      assert.deepEqual(caregiverGroups, ["home", "patients", "tasks", "schedule", "alerts", "more"]);
    });
  });

  describe("2. Canonical Destination Registry & Integrity", () => {
    it("every destination has a valid group belonging to its workspace", () => {
      for (const dest of WORKSPACE_DESTINATIONS) {
        const validGroupIds = getWorkspaceGroups(dest.workspace).map((g) => g.id);
        assert.ok(
          validGroupIds.includes(dest.groupId),
          `Destination ${dest.id} (${dest.href}) has groupId "${dest.groupId}" which is not in workspace ${dest.workspace}`
        );
        assert.ok(dest.href.startsWith("/"), `Destination ${dest.id} href must be absolute`);
        assert.ok(dest.label.length > 0, `Destination ${dest.id} missing label`);
        assert.ok(dest.description.length > 0, `Destination ${dest.id} missing description`);
        assert.ok(dest.keywords.length > 0, `Destination ${dest.id} missing keywords`);
      }
    });

    it("preserves all critical existing routes without breaking deep links", () => {
      const essentialRoutes = [
        // Admin
        "/admin",
        "/admin/prescriptions",
        "/admin/prescriptions/new",
        "/admin/refills",
        "/admin/dispensing",
        "/admin/medications",
        "/admin/medications/add",
        "/admin/inventory",
        "/admin/orders",
        "/admin/customers",
        "/admin/services",
        "/admin/screenings",
        "/admin/vaccinations",
        "/admin/adherence",
        "/admin/inbox",
        "/admin/feel",
        "/admin/campaigns",
        "/admin/analytics",
        "/admin/analytics/sales",
        "/admin/settings/location",
        "/admin/settings/storefront",
        "/admin/settings/integrations",
        "/admin/setup",
        "/admin/select",
        // Extended Admin
        "/admin/analytics/reconciliation",
        "/admin/settings/payments",
        // Platform
        "/platform",
        "/platform/applications",
        "/platform/pharmacies",
        "/platform/billing",
        "/platform/invoices",
        "/platform/subscriptions",
        "/platform/usage",
        "/platform/plans",
        "/platform/jobs",
        "/platform/security",
        "/platform/compliance",
        "/platform/audit",
        // Portal
        "/portal",
        "/portal/refills",
        "/portal/refills/new",
        "/portal/prescriptions",
        "/portal/calendar",
        "/portal/sync",
        "/portal/orders",
        "/portal/orders/new",
        "/portal/screenings",
        "/portal/vaccinations",
        "/portal/feel",
        "/portal/messages",
        "/portal/profile",
        "/portal/preferences",
        // Caregiver
        "/caregiver",
        "/caregiver/patients",
        "/caregiver/refills",
        "/caregiver/refills/new",
        "/caregiver/reminders",
        "/caregiver/notifications",
        "/caregiver/adherence",
        "/caregiver/accept",
      ];

      for (const route of essentialRoutes) {
        const found = WORKSPACE_DESTINATIONS.some((d) => d.href === route);
        assert.ok(found, `Essential route missing from canonical registry: ${route}`);
      }
    });

    it("correctly resolves destination for exact, nested, and query/hash paths", () => {
      const exact = getDestinationForPath("/admin/prescriptions");
      assert.equal(exact?.id, "admin-prescriptions");

      const withQuery = getDestinationForPath("/admin/prescriptions?status=active&sort=desc#top", "admin");
      assert.equal(withQuery?.id, "admin-prescriptions");

      const nested = getDestinationForPath("/admin/medications/some-drug-id", "admin");
      assert.equal(nested?.id, "admin-medications");
    });
  });

  describe("3. Permission-Aware Access & Search Security", () => {
    it("never exposes clinical or settings routes to basic staff in destination checks or search", () => {
      const staffUser = mockSession("staff");

      // Direct access check
      const prescrDest = WORKSPACE_DESTINATIONS.find((d) => d.href === "/admin/prescriptions")!;
      const settingsDest = WORKSPACE_DESTINATIONS.find((d) => d.href === "/admin/settings/location")!;
      const ordersDest = WORKSPACE_DESTINATIONS.find((d) => d.href === "/admin/orders")!;

      assert.equal(canAccessDestination(staffUser, ordersDest), true);
      assert.equal(canAccessDestination(staffUser, prescrDest), false);
      assert.equal(canAccessDestination(staffUser, settingsDest), false);

      // Search results must never return inaccessible routes
      const searchForPrescr = searchWorkspace("prescriptions", "admin", staffUser);
      assert.equal(
        searchForPrescr.some((m) => m.destination.href === "/admin/prescriptions"),
        false
      );

      const searchForSettings = searchWorkspace("opening hours", "admin", staffUser);
      assert.equal(
        searchForSettings.some((m) => m.destination.href === "/admin/settings/location"),
        false
      );
    });

    it("allows pharmacists access to clinical workflows but not settings", () => {
      const pharmacistUser = mockSession("pharmacist");

      const prescrDest = WORKSPACE_DESTINATIONS.find((d) => d.href === "/admin/prescriptions")!;
      const settingsDest = WORKSPACE_DESTINATIONS.find((d) => d.href === "/admin/settings/location")!;

      assert.equal(canAccessDestination(pharmacistUser, prescrDest), true);
      assert.equal(canAccessDestination(pharmacistUser, settingsDest), false);
    });

    it("strictly blocks non-platform-admins from platform workspace destinations and searches", () => {
      const regularUser = mockSession("owner", { platformAdmin: false });
      const platformDest = WORKSPACE_DESTINATIONS.find((d) => d.href === "/platform/applications")!;

      assert.equal(canAccessDestination(regularUser, platformDest), false);

      const searchPlatform = searchWorkspace("applications", "platform", regularUser);
      assert.equal(searchPlatform.length, 0);
    });

    it("allows platform admins full platform access", () => {
      const adminUser = mockSession("owner", { platformAdmin: true });
      const platformDest = WORKSPACE_DESTINATIONS.find((d) => d.href === "/platform/applications")!;

      assert.equal(canAccessDestination(adminUser, platformDest), true);
    });
  });

  describe("4. Aether Command Center Deterministic Intent Matching", () => {
    it("handles 'update Panadol stock' by navigating directly to inventory with query", () => {
      const managerUser = mockSession("manager");
      const results = searchWorkspace("update Panadol stock", "admin", managerUser);

      assert.ok(results.length > 0, "Should match Panadol stock intent");
      const top = results[0];
      assert.equal(top.matchType, "intent");
      assert.ok(top.destination.href.toLowerCase().includes("panadol"));
      assert.ok(top.destination.href.startsWith("/admin/inventory"));
    });

    it("handles 'new prescription' by navigating directly to /admin/prescriptions/new", () => {
      const managerUser = mockSession("manager");
      const results = searchWorkspace("new prescription", "admin", managerUser);

      assert.ok(results.length > 0);
      assert.equal(results[0].destination.href, "/admin/prescriptions/new");
    });

    it("handles 'low stock' by jumping to inventory health", () => {
      const managerUser = mockSession("manager");
      const results = searchWorkspace("low stock", "admin", managerUser);

      assert.ok(results.length > 0);
      assert.equal(results[0].destination.href, "/admin/inventory");
    });

    it("handles 'verify pharmacy' on platform side", () => {
      const platformAdmin = mockSession("owner", { platformAdmin: true });
      const results = searchWorkspace("verify pharmacy", "platform", platformAdmin);

      assert.ok(results.length > 0);
      assert.equal(results[0].destination.href, "/platform/applications");
    });

    it("handles 'billing' on platform side", () => {
      const platformAdmin = mockSession("owner", { platformAdmin: true });
      const results = searchWorkspace("billing", "platform", platformAdmin);

      assert.ok(results.length > 0);
      assert.equal(results[0].destination.href, "/platform/billing");
    });

    it("handles 'my refill' on portal side", () => {
      const customer = mockSession("staff", { isCustomer: true });
      const results = searchWorkspace("my refill", "portal", customer);

      assert.ok(results.length > 0);
      assert.equal(results[0].destination.href, "/portal/refills");
    });

    it("handles 'John medication' on caregiver side", () => {
      const caregiver = mockSession("staff", { isCaregiver: true });
      const results = searchWorkspace("John medication", "caregiver", caregiver);

      assert.ok(results.length > 0);
      assert.ok(results[0].destination.href.toLowerCase().includes("john"));
      assert.ok(results[0].destination.href.startsWith("/caregiver/patients"));
    });

    it("handles 'change opening hours' in admin settings", () => {
      const managerUser = mockSession("manager");
      const results = searchWorkspace("change opening hours", "admin", managerUser);

      assert.ok(results.length > 0);
      assert.equal(results[0].destination.href, "/admin/settings/location");
    });

    it("handles 'sales this month' in admin analytics", () => {
      const managerUser = mockSession("manager");
      const results = searchWorkspace("sales this month", "admin", managerUser);

      assert.ok(results.length > 0);
      assert.equal(results[0].destination.href, "/admin/analytics/sales");
    });

    it("handles generic medication queries like 'amoxicillin' and 'metformin stock' dynamically", () => {
      const managerUser = mockSession("manager");

      const amoxResults = searchWorkspace("amoxicillin", "admin", managerUser);
      assert.ok(amoxResults.length > 0, "Should match generic medicine amoxicillin");
      assert.ok(amoxResults[0].destination.href.toLowerCase().includes("amoxicillin"));

      const metfResults = searchWorkspace("metformin stock", "admin", managerUser);
      assert.ok(metfResults.length > 0, "Should match metformin stock");
      assert.ok(metfResults[0].destination.href.toLowerCase().includes("metformin"));
      assert.ok(metfResults[0].destination.href.startsWith("/admin/inventory"));
    });
  });

  describe("5. Contextual Task Surfaces & Progressive Disclosure", () => {
    it("surfaces all Requirement 3 medication nearby actions on medicine routes", () => {
      const manager = mockSession("manager");
      const actions = getContextualActions("/admin/medications/med-42", "admin", manager);

      const labels = actions.map((a) => a.label);
      // All Requirement 3 medication actions:
      // Update stock, Receive stock, Change price, View sales, View batches, Edit medicine, Scan pack
      assert.ok(labels.includes("Update stock"), "Missing Update stock action");
      assert.ok(labels.includes("Receive stock"), "Missing Receive stock action");
      assert.ok(labels.includes("Change price"), "Missing Change price action");
      assert.ok(labels.includes("View sales"), "Missing View sales action");
      assert.ok(labels.includes("View batches"), "Missing View batches action");
      assert.ok(labels.includes("Edit medicine"), "Missing Edit medicine action");
      assert.ok(labels.includes("Scan pack"), "Missing Scan pack action");
    });

    it("surfaces all Requirement 3 patient nearby actions on customer routes", () => {
      const manager = mockSession("manager");
      const actions = getContextualActions("/admin/customers/cust-42", "admin", manager);

      const labels = actions.map((a) => a.label);
      // All Requirement 3 patient actions:
      // Prescription, Refill, Message, Adherence, Orders, Care history
      assert.ok(labels.includes("Write prescription"), "Missing Prescription action");
      assert.ok(labels.includes("Submit refill"), "Missing Refill action");
      assert.ok(labels.includes("Send message"), "Missing Message action");
      assert.ok(labels.includes("Adherence history"), "Missing Adherence action");
      assert.ok(labels.includes("Orders"), "Missing Orders action");
      assert.ok(labels.includes("Care history"), "Missing Care history action");
    });

    it("surfaces all Requirement 3 pharmacy verification actions on platform applications", () => {
      const platformAdmin = mockSession("owner", { platformAdmin: true });
      const actions = getContextualActions("/platform/applications/app-1", "platform", platformAdmin);

      const labels = actions.map((a) => a.label);
      // All Requirement 3 pharmacy app actions:
      // Verification, Documents, Compliance, Billing, Communication, Audit trail
      assert.ok(labels.includes("Pending applications"), "Missing Pending applications action");
      assert.ok(labels.includes("Verification"), "Missing Verification action");
      assert.ok(labels.includes("Documents"), "Missing Documents action");
      assert.ok(labels.includes("Compliance checks"), "Missing Compliance checks action");
      assert.ok(labels.includes("Billing"), "Missing Billing action");
      assert.ok(labels.includes("Communication"), "Missing Communication action");
      assert.ok(labels.includes("Audit log"), "Missing Audit log action");
    });
  });

  describe("6. Destination Loading Status Formatting", () => {
    it("generates realistic, destination-oriented status without fake technical stages", () => {
      const invInfo = getDestinationLoadingInfo("/admin/inventory", "admin");
      assert.equal(invInfo.title, "Opening Stock & inventory…");
      assert.ok(!invInfo.title.includes("SQL"));
      assert.ok(!invInfo.title.includes("database"));

      const custInfo = getDestinationLoadingInfo("/admin/customers/123", "admin");
      assert.equal(custInfo.title, "Opening Patient Record…");
      assert.ok(custInfo.subtitle.includes("prescriptions"));

      const rxInfo = getDestinationLoadingInfo("/admin/prescriptions/456", "admin");
      assert.equal(rxInfo.title, "Opening Prescription…");
    });
  });
});
