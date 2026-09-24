import "./test-env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { prismaUnscoped as db } from "../app/lib/db";
import { releasePremiumOverflow } from "../app/lib/platform/plan-enforcement";
import { getPharmacyPlanState } from "../app/lib/platform/plan-state";
import { withPlatformBypass } from "../app/lib/tenant-context";

const testDatabaseUrl =
  process.env.KYP_TEST_DATABASE_URL ||
  (process.env.CI === "true" ? process.env.DATABASE_URL : undefined);

test(
  "Premium downgrade preserves records and reactivation restores plan-paused capacity",
  { skip: !testDatabaseUrl },
  async () => {
    process.env.DATABASE_URL = testDatabaseUrl;

    await withPlatformBypass(async () => {
      const now = new Date();
      const owner = await db.user.create({
        data: {
          email: `plan-lifecycle-${randomUUID()}@example.test`,
          passwordHash: "test-only",
          role: "manager",
        },
      });

      const pharmacy = await db.pharmacy.create({
        data: {
          name: "Plan lifecycle pharmacy",
          slug: randomUUID(),
          ownerUserId: owner.id,
          status: "active",
          lifecycleStatus: "active",
          listed: true,
          verifiedAt: now,
          setupCompletedAt: now,
        },
      });

      const plan = await db.plan.create({
        data: {
          slug: `test-premium-${randomUUID()}`,
          name: "Test Premium",
          priceKes: 500,
          active: true,
        },
      });

      const subscription = await db.subscription.create({
        data: {
          pharmacyId: pharmacy.id,
          planId: plan.id,
          status: "active",
          currentPeriodStart: new Date(now.getTime() - 86400000),
          currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
        },
      });

      const originalServiceBookable = new Map<string, boolean>();

      for (let index = 0; index < 7; index += 1) {
        const master = await db.medicationMaster.create({
          data: {
            name: `Lifecycle medicine ${index} ${randomUUID()}`,
            genericName: `Lifecycle generic ${index}`,
            slug: randomUUID(),
          },
        });
        await db.pharmacyInventory.create({
          data: {
            pharmacyId: pharmacy.id,
            medicationMasterId: master.id,
            slug: randomUUID(),
            price: 100 + index,
            currentStock: 10,
            active: true,
            publicListing: true,
            prescriptionRequired: false,
            overTheCounter: true,
          },
        });
      }

      for (let index = 0; index < 4; index += 1) {
        const service = await db.pharmacyService.create({
          data: {
            pharmacyId: pharmacy.id,
            slug: randomUUID(),
            title: `Lifecycle service ${index}`,
            short: "Lifecycle service",
            description: "Lifecycle service used to verify reversible plan capacity.",
            active: true,
            bookable: index !== 3,
          },
        });
        originalServiceBookable.set(service.id, service.bookable);
      }

      assert.equal(
        (await getPharmacyPlanState(pharmacy.id)).premiumEntitlementsActive,
        true,
      );
      assert.equal(
        await db.pharmacyInventory.count({
          where: { pharmacyId: pharmacy.id, active: true, publicListing: true },
        }),
        7,
      );
      assert.equal(
        await db.pharmacyService.count({
          where: { pharmacyId: pharmacy.id, active: true },
        }),
        4,
      );

      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "cancelled",
          cancelAt: now,
          cancelledAt: now,
          currentPeriodEnd: now,
        },
      });

      const downgrade = await releasePremiumOverflow(pharmacy.id);
      assert.equal(downgrade.medicines, 2);
      assert.equal(downgrade.services, 2);
      assert.equal(
        await db.pharmacyInventory.count({
          where: { pharmacyId: pharmacy.id, active: true, publicListing: true },
        }),
        5,
      );
      assert.equal(
        await db.pharmacyInventory.count({
          where: { pharmacyId: pharmacy.id, planPaused: true },
        }),
        2,
      );
      assert.equal(
        await db.pharmacyService.count({
          where: { pharmacyId: pharmacy.id, active: true },
        }),
        2,
      );
      assert.equal(
        await db.pharmacyService.count({
          where: { pharmacyId: pharmacy.id, planPaused: true },
        }),
        2,
      );
      assert.equal(
        await db.pharmacyInventory.count({ where: { pharmacyId: pharmacy.id } }),
        7,
        "downgrade must not delete medicine records",
      );
      assert.equal(
        await db.pharmacyService.count({ where: { pharmacyId: pharmacy.id } }),
        4,
        "downgrade must not delete service records",
      );

      const freshStart = new Date(Date.now() - 1000);
      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          currentPeriodStart: freshStart,
          currentPeriodEnd: new Date(freshStart.getTime() + 30 * 86400000),
          cancelAt: null,
          cancelledAt: null,
        },
      });

      const restore = await releasePremiumOverflow(pharmacy.id);
      assert.equal(restore.medicines, 2);
      assert.equal(restore.services, 2);
      assert.equal(
        await db.pharmacyInventory.count({
          where: { pharmacyId: pharmacy.id, active: true, publicListing: true },
        }),
        7,
      );
      assert.equal(
        await db.pharmacyInventory.count({
          where: { pharmacyId: pharmacy.id, planPaused: true },
        }),
        0,
      );

      const restoredServices = await db.pharmacyService.findMany({
        where: { pharmacyId: pharmacy.id },
        select: { id: true, active: true, bookable: true, planPaused: true },
      });
      assert.equal(restoredServices.filter((service) => service.active).length, 4);
      assert.equal(restoredServices.filter((service) => service.planPaused).length, 0);
      for (const service of restoredServices) {
        assert.equal(
          service.bookable,
          originalServiceBookable.get(service.id),
          "reactivation must restore each service's previous bookable state",
        );
      }

      assert.equal(
        (await getPharmacyPlanState(pharmacy.id)).premiumEntitlementsActive,
        true,
      );
    });
  },
);
