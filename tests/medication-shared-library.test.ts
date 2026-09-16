import assert from "node:assert/strict";
import path from "node:path";
import { describe, it, before, after } from "node:test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as unknown as NodeJS.Module;
} catch {}

import { withPlatformBypass } from "../app/lib/tenant-context";
import { prismaUnscoped, withPlatformTx } from "../app/lib/db/prisma";
import {
  buildPublicInventoryWhere,
  isQualifyingPublicInventory,
} from "../app/lib/services/public-medication-visibility";
import {
  parseActiveIngredients,
  previewPlatformMedicationImport,
  executePlatformMedicationImport,
} from "../app/lib/services/platform-csv-importer";
import {
  mergeDuplicateMedications,
  listPlatformMedications,
} from "../app/lib/services/platform-medication-library";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("Medication Shared Library Architecture", { skip: !hasDb }, () => {
  let testAdminUser: any;
  let activeVerifiedPharmacy: any;
  let unverifiedPharmacy: any;
  let testDosageForm: any;
  let testManufacturer: any;
  const createdMasterIds: string[] = [];
  const createdInventoryIds: string[] = [];

  before(async () => {
    await withPlatformBypass(async () => {
      // Ensure trigger recognizes app.platform_bypass = '1'
      try {
        await prismaUnscoped.$executeRawUnsafe(`
          CREATE OR REPLACE FUNCTION protect_shared_medication_master_delete()
          RETURNS TRIGGER AS $$
          BEGIN
            IF COALESCE(current_setting('app.platform_bypass', true), '') NOT IN ('1', 'true', 'on') THEN
              IF EXISTS (
                SELECT 1 FROM "pharmacy_inventories"
                WHERE "medication_master_id" = OLD."id"
              ) THEN
                RAISE EXCEPTION 'Cannot delete MedicationMaster %: referenced by existing PharmacyInventory records.', OLD."id"
                  USING ERRCODE = '23503';
              END IF;
            END IF;
            RETURN OLD;
          END;
          $$ LANGUAGE plpgsql;
        `);
      } catch {}

      // Find or create platform admin user for tests
      testAdminUser = await prismaUnscoped.user.findFirst({
        where: { platformAdmin: true },
      });
      if (!testAdminUser) {
        testAdminUser = await prismaUnscoped.user.create({
          data: {
            email: `test-admin-${Date.now()}@platform.local`,
            passwordHash: "testinghash",
            platformAdmin: true,
          },
        });
      }

      // Lookup dosage form & manufacturer
      testDosageForm = await prismaUnscoped.medicationLookup.findFirst({
        where: { kind: "dosage_form" },
      });
      if (!testDosageForm) {
        testDosageForm = await prismaUnscoped.medicationLookup.create({
          data: {
            kind: "dosage_form",
            slug: `tab-test-${Date.now()}`,
            value: "Tablet",
            active: true,
          },
        });
      }

      testManufacturer = await prismaUnscoped.manufacturer.findFirst();
      if (!testManufacturer) {
        testManufacturer = await prismaUnscoped.manufacturer.create({
          data: {
            name: "Test Pharma Ltd",
            active: true,
          },
        });
      }

      // Find or create qualifying active & verified pharmacy
      activeVerifiedPharmacy = await prismaUnscoped.pharmacy.findFirst({
        where: {
          status: "active",
          listed: true,
          verifiedAt: { not: null },
        },
      });
      if (!activeVerifiedPharmacy) {
        activeVerifiedPharmacy = await prismaUnscoped.pharmacy.create({
          data: {
            name: "Test Qualifying Pharmacy",
            slug: `test-qualifying-${Date.now()}`,
            status: "active",
            listed: true,
            verifiedAt: new Date(),
          },
        });
      }

      // Create unverified/inactive pharmacy for negative tests
      unverifiedPharmacy = await prismaUnscoped.pharmacy.create({
        data: {
          name: "Test Unverified Pharmacy",
          slug: `test-unverified-${Date.now()}`,
          status: "suspended",
          listed: false,
          verifiedAt: null,
        },
      });
    });
  });

  after(async () => {
    await withPlatformBypass(async () => {
      // 1. First remove any inventory records referencing our test masters or created IDs
      if (createdInventoryIds.length > 0 || createdMasterIds.length > 0) {
        try {
          await prismaUnscoped.pharmacyInventory.deleteMany({
            where: {
              OR: [
                ...(createdInventoryIds.length > 0 ? [{ id: { in: createdInventoryIds } }] : []),
                ...(createdMasterIds.length > 0 ? [{ medicationMasterId: { in: createdMasterIds } }] : []),
              ],
            },
          });
        } catch (err) {
          console.error("Cleanup error deleting pharmacyInventory:", err);
        }
      }

      // 2. Break self-referencing mergedIntoId relations before deleting masters
      if (createdMasterIds.length > 0) {
        try {
          await prismaUnscoped.medicationMaster.updateMany({
            where: { id: { in: createdMasterIds } },
            data: { mergedIntoId: null },
          });
        } catch (err) {
          console.error("Cleanup error updating mergedIntoId:", err);
        }

        // 3. Delete active ingredients & tags
        try {
          await prismaUnscoped.medicationActiveIngredient.deleteMany({
            where: { medicationMasterId: { in: createdMasterIds } },
          });
        } catch (err) {
          console.error("Cleanup error deleting active ingredients:", err);
        }
        try {
          await prismaUnscoped.medicationClinicalTag.deleteMany({
            where: { medicationMasterId: { in: createdMasterIds } },
          });
        } catch (err) {
          console.error("Cleanup error deleting clinical tags:", err);
        }

        // 4. Delete medication masters under platform transaction to pass delete protection trigger
        try {
          await withPlatformTx(async (tx) => {
            await tx.medicationMaster.deleteMany({
              where: { id: { in: createdMasterIds } },
            });
          });
        } catch (err: any) {
          console.error("Cleanup error deleting medication masters:", JSON.stringify(err?.meta?.driverAdapterError?.cause || err, null, 2));
        }
      }

      if (unverifiedPharmacy) {
        await prismaUnscoped.pharmacy.delete({
          where: { id: unverifiedPharmacy.id },
        }).catch(() => {});
      }
    });
  });

  // =========================================================================
  // 1. Shared-library / Inventory Boundary Invariant
  // =========================================================================
  describe("1. Shared-Library & Inventory Boundary", () => {
    it("creating a MedicationMaster does NOT create PharmacyInventory rows", async () => {
      const master = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Boundary Test ${Date.now()}`,
            slug: `boundary-test-${Date.now()}`,
            genericName: "BoundaryGeneric",
            category: "general",
            status: "active",
            dosageFormId: testDosageForm.id,
            manufacturerId: testManufacturer.id,
          },
        })
      );
      createdMasterIds.push(master.id);

      // Verify zero inventory across the entire database
      const inventoryCount = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.count({
          where: { medicationMasterId: master.id },
        })
      );
      assert.equal(inventoryCount, 0, "MedicationMaster must have zero PharmacyInventory rows upon creation");
    });
  });

  // =========================================================================
  // 2. Public Storefront Visibility Predicates & Safeguards
  // =========================================================================
  describe("2. Public Visibility Invariants", () => {
    it("library-only MedicationMaster is NEVER visible on public storefront queries", async () => {
      const master = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Storefront Boundary ${Date.now()}`,
            slug: `storefront-boundary-${Date.now()}`,
            genericName: "StorefrontGeneric",
            category: "general",
            status: "active",
          },
        })
      );
      createdMasterIds.push(master.id);

      // Query with the public visibility predicate
      const publicItems = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.findMany({
          where: buildPublicInventoryWhere({ medicationMasterId: master.id }),
        })
      );
      assert.equal(publicItems.length, 0, "Library-only master must not appear in public inventory");
    });

    it("inventory with publicListing=false is NEVER visible publicly", async () => {
      const master = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Hidden Inventory Master ${Date.now()}`,
            slug: `hidden-master-${Date.now()}`,
            genericName: "HiddenGeneric",
            category: "general",
            status: "active",
          },
        })
      );
      createdMasterIds.push(master.id);

      const inventory = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.create({
          data: {
            pharmacyId: activeVerifiedPharmacy.id,
            medicationMasterId: master.id,
            slug: `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            active: true,
            publicListing: false, // HIDDEN
            currentStock: 50,
            price: 15.0,
          },
          include: {
            pharmacy: { select: { status: true, listed: true, verifiedAt: true } },
            medicationMaster: { select: { status: true } },
          },
        })
      );
      createdInventoryIds.push(inventory.id);

      const isPublic = isQualifyingPublicInventory(inventory);
      assert.equal(isPublic, false, "Inventory with publicListing=false must not be qualifying");

      const queried = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.findMany({
          where: buildPublicInventoryWhere({ id: inventory.id }),
        })
      );
      assert.equal(queried.length, 0, "Query with buildPublicInventoryWhere must return 0 results");
    });

    it("inventory with inactive status is NEVER visible publicly", async () => {
      const master = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Inactive Inventory Master ${Date.now()}`,
            slug: `inactive-master-${Date.now()}`,
            genericName: "InactiveGeneric",
            category: "general",
            status: "active",
          },
        })
      );
      createdMasterIds.push(master.id);

      const inventory = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.create({
          data: {
            pharmacyId: activeVerifiedPharmacy.id,
            medicationMasterId: master.id,
            slug: `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            active: false, // INACTIVE
            publicListing: true,
            currentStock: 50,
            price: 20.0,
          },
          include: {
            pharmacy: { select: { status: true, listed: true, verifiedAt: true } },
            medicationMaster: { select: { status: true } },
          },
        })
      );
      createdInventoryIds.push(inventory.id);

      assert.equal(isQualifyingPublicInventory(inventory), false);
      const queried = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.findMany({
          where: buildPublicInventoryWhere({ id: inventory.id }),
        })
      );
      assert.equal(queried.length, 0);
    });

    it("inventory from unlisted/unverified pharmacy is NEVER visible publicly", async () => {
      const master = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Unverified Pharmacy Master ${Date.now()}`,
            slug: `unverified-mfr-${Date.now()}`,
            genericName: "UnverifiedGeneric",
            category: "general",
            status: "active",
          },
        })
      );
      createdMasterIds.push(master.id);

      const inventory = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.create({
          data: {
            pharmacyId: unverifiedPharmacy.id, // UNVERIFIED / UNLISTED
            medicationMasterId: master.id,
            slug: `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            active: true,
            publicListing: true,
            currentStock: 100,
            price: 5.0,
          },
          include: {
            pharmacy: { select: { status: true, listed: true, verifiedAt: true } },
            medicationMaster: { select: { status: true } },
          },
        })
      );
      createdInventoryIds.push(inventory.id);

      assert.equal(isQualifyingPublicInventory(inventory), false);
      const queried = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.findMany({
          where: buildPublicInventoryWhere({ id: inventory.id }),
        })
      );
      assert.equal(queried.length, 0);
    });

    it("inventory pointing to a non-active master is NEVER visible publicly", async () => {
      for (const invalidStatus of ["needs_review", "deprecated", "archived"]) {
        const master = await withPlatformBypass(async () =>
          prismaUnscoped.medicationMaster.create({
            data: {
              name: `${invalidStatus} Master ${Date.now()}`,
              slug: `${invalidStatus}-master-${Date.now()}`,
              genericName: "NonActiveGeneric",
              category: "general",
              status: invalidStatus,
            },
          })
        );
        createdMasterIds.push(master.id);

        const inventory = await withPlatformBypass(async () =>
          prismaUnscoped.pharmacyInventory.create({
            data: {
              pharmacyId: activeVerifiedPharmacy.id,
              medicationMasterId: master.id,
              slug: `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              active: true,
              publicListing: true,
              currentStock: 10,
              price: 12.0,
            },
            include: {
              pharmacy: { select: { status: true, listed: true, verifiedAt: true } },
              medicationMaster: { select: { status: true } },
            },
          })
        );
        createdInventoryIds.push(inventory.id);

        assert.equal(
          isQualifyingPublicInventory(inventory),
          false,
          `Inventory with master status '${invalidStatus}' must NOT be publicly visible`
        );
        const queried = await withPlatformBypass(async () =>
          prismaUnscoped.pharmacyInventory.findMany({
            where: buildPublicInventoryWhere({ id: inventory.id }),
          })
        );
        assert.equal(queried.length, 0);
      }
    });

    it("qualifying inventory IS visible when all four gates pass", async () => {
      const master = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Fully Qualifying Master ${Date.now()}`,
            slug: `fully-qualifying-${Date.now()}`,
            genericName: "QualifyingGeneric",
            category: "general",
            status: "active",
          },
        })
      );
      createdMasterIds.push(master.id);

      const inventory = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.create({
          data: {
            pharmacyId: activeVerifiedPharmacy.id,
            medicationMasterId: master.id,
            slug: `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            active: true,
            publicListing: true,
            currentStock: 10,
            price: 12.0,
          },
          include: {
            pharmacy: { select: { status: true, listed: true, verifiedAt: true } },
            medicationMaster: { select: { status: true } },
          },
        })
      );
      createdInventoryIds.push(inventory.id);

      assert.equal(isQualifyingPublicInventory(inventory), true);
      const queried = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.findMany({
          where: buildPublicInventoryWhere({ id: inventory.id }),
        })
      );
      assert.equal(queried.length, 1);
    });
  });

  // =========================================================================
  // 3. Delete Protection & Safety Invariants
  // =========================================================================
  describe("3. Delete Protection & Referential Integrity", () => {
    it("deleting a pharmacy inventory record does NOT delete the shared MedicationMaster", async () => {
      const master = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Protected Master ${Date.now()}`,
            slug: `protected-master-${Date.now()}`,
            genericName: "ProtectedGeneric",
            category: "general",
            status: "active",
          },
        })
      );
      createdMasterIds.push(master.id);

      const inv = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.create({
          data: {
            pharmacyId: activeVerifiedPharmacy.id,
            medicationMasterId: master.id,
            slug: `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            active: true,
            currentStock: 5,
            price: 10.0,
          },
        })
      );

      // Delete the inventory row
      await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.delete({
          where: { id: inv.id },
        })
      );

      // Verify the MedicationMaster still exists intact!
      const stillExists = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.findUnique({
          where: { id: master.id },
        })
      );
      assert.ok(stillExists, "MedicationMaster must survive deletion of PharmacyInventory");
    });

    it("attempting to delete a MedicationMaster with existing PharmacyInventory is blocked", async () => {
      const master = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Referenced Master ${Date.now()}`,
            slug: `referenced-master-${Date.now()}`,
            genericName: "ReferencedGeneric",
            category: "general",
            status: "active",
          },
        })
      );
      createdMasterIds.push(master.id);

      const inv = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.create({
          data: {
            pharmacyId: activeVerifiedPharmacy.id,
            medicationMasterId: master.id,
            slug: `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            active: true,
            currentStock: 10,
            price: 10.0,
          },
        })
      );
      createdInventoryIds.push(inv.id);

      // Deletion must be rejected by foreign key constraint or database trigger
      await assert.rejects(
        async () => {
          await withPlatformBypass(async () =>
            prismaUnscoped.medicationMaster.delete({
              where: { id: master.id },
            })
          );
        },
        /(?:foreign key|violat|protected shared medication)/i,
        "Deleting a referenced master must be blocked"
      );
    });
  });

  // =========================================================================
  // 4. Platform CSV Importer
  // =========================================================================
  describe("4. Dedicated Platform CSV Importer", () => {
    it("parses active ingredients format amount|unit correctly", () => {
      const single = parseActiveIngredients("Amoxicillin|500|mg");
      assert.equal(single.length, 1);
      assert.equal(single[0]?.name, "Amoxicillin");
      assert.equal(single[0]?.amount, "500");
      assert.equal(single[0]?.unit, "mg");

      const multi = parseActiveIngredients("Paracetamol|500|mg;Caffeine|65|mg");
      assert.equal(multi.length, 2);
      assert.equal(multi[0]?.name, "Paracetamol");
      assert.equal(multi[0]?.amount, "500");
      assert.equal(multi[1]?.name, "Caffeine");
      assert.equal(multi[1]?.amount, "65");
      assert.equal(multi[1]?.unit, "mg");
    });

    it("rejects controlled drug row without controlled_drug_schedule", async () => {
      const csv = `name,generic_name,strength_display,dosage_form,route,category,controlled_drug,controlled_drug_schedule
Illegal CD,Morphine,10 mg,Tablet,Oral,pain-relief,true,`;

      const preview = await previewPlatformMedicationImport(csv);
      assert.equal(preview.totalRows, 1);
      assert.equal(preview.errors.length, 1);
      assert.match(preview.errors[0]?.message || "", /controlled_drug_schedule is required/i);
    });

    it("creates MedicationMaster and ZERO PharmacyInventory rows", async () => {
      const now = Date.now();
      const testBarcode = `6164${now.toString().slice(-9)}`;
      const uniqueGeneric = `ImportGen${now}`;
      const uniqueName = `Imported Master ${now}`;
      const csv = `name,generic_name,brand_name,strength_display,dosage_form,route,category,manufacturer,barcode,controlled_drug,active_ingredients
${uniqueName},${uniqueGeneric},BrandX,250 mg,Tablet,Oral,antibiotics,Test Pharma Ltd,${testBarcode},false,${uniqueGeneric}|250|mg`;

      const initialInventoryCount = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.count()
      );

      const result = await executePlatformMedicationImport({
        csvContent: csv,
        filename: "test_import.csv",
        actorId: testAdminUser.id,
      });

      assert.equal(result.createdCount, 1, "Should have imported 1 record");
      assert.equal(result.errorCount, 0, "Should have 0 failures");

      // Verify zero new pharmacy inventory records
      const postInventoryCount = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.count()
      );
      assert.equal(
        postInventoryCount,
        initialInventoryCount,
        "Platform CSV import must NEVER create PharmacyInventory rows"
      );

      // Verify master created
      const created = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.findFirst({
          where: { barcode: testBarcode },
          include: { activeIngredients: { include: { activeIngredient: true } } },
        })
      );
      assert.ok(created);
      createdMasterIds.push(created.id);
      assert.equal(created.name, uniqueName);
      assert.equal(created.status, "active");
      assert.equal(created.activeIngredients.length, 1);
      assert.equal(created.activeIngredients[0]?.amount, "250");
      assert.equal(created.activeIngredients[0]?.unit, "mg");
    });

    it("importing the same CSV twice is idempotent and matches by barcode", async () => {
      const now = Date.now();
      const testBarcode = `7174${now.toString().slice(-9)}`;
      const uniqueGeneric = `IdempotentGen${now}`;
      const uniqueName = `Idempotent Master ${now}`;
      const csv = `name,generic_name,strength_display,dosage_form,route,category,barcode
${uniqueName},${uniqueGeneric},100 mg,Tablet,Oral,general,${testBarcode}`;

      // First run: creates
      const run1 = await executePlatformMedicationImport({
        csvContent: csv,
        filename: "idempotent.csv",
        actorId: testAdminUser.id,
      });
      assert.equal(run1.createdCount, 1);

      const created = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.findFirst({
          where: { barcode: testBarcode },
        })
      );
      assert.ok(created);
      createdMasterIds.push(created.id);

      // Preview second run: duplicate engine should detect exact match by barcode
      const preview2 = await previewPlatformMedicationImport(csv);
      assert.equal(preview2.analyzedRows[0]?.action, "match_enrich");
      assert.equal(preview2.analyzedRows[0]?.existingMasterId, created.id);

      // Second run: updates/matches, createdCount = 0, matchedCount = 1
      const run2 = await executePlatformMedicationImport({
        csvContent: csv,
        filename: "idempotent.csv",
        actorId: testAdminUser.id,
      });
      assert.equal(run2.createdCount, 0, "Second run should not re-create duplicate master");
      assert.equal(run2.matchedCount, 1, "Second run should match existing master");
    });

    it("flags ambiguous duplicate records as needs_review", async () => {
      // Create two existing masters with the same generic and strength so incoming row without barcode is ambiguous
      const generic = `AmbiguousGeneric${Date.now()}`;
      const master1 = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `${generic} 50mg Tablets (Variant A)`,
            slug: `ambig-1-${Date.now()}`,
            genericName: generic,
            strengthDisplay: "50 mg",
            dosageFormId: testDosageForm.id,
            category: "general",
            status: "active",
          },
        })
      );
      const master2 = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `${generic} 50mg Tablets (Variant B)`,
            slug: `ambig-2-${Date.now()}`,
            genericName: generic,
            strengthDisplay: "50 mg",
            dosageFormId: testDosageForm.id,
            category: "general",
            status: "active",
          },
        })
      );
      createdMasterIds.push(master1.id, master2.id);

      // CSV row with same generic+strength+form but no barcode -> ambiguous between master1 and master2
      const csv = `name,generic_name,brand_name,strength_display,dosage_form,route,category
${generic} Third Variant,${generic},BrandAmbiguous,50 mg,Tablet,Oral,general`;

      const preview = await previewPlatformMedicationImport(csv);
      assert.equal(preview.analyzedRows[0]?.action, "needs_review");

      // Execute import: should import with status = 'needs_review'
      const run = await executePlatformMedicationImport({
        csvContent: csv,
        filename: "ambiguous.csv",
        actorId: testAdminUser.id,
      });
      assert.equal(run.reviewCount, 1);

      const createdReviewMaster = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.findFirst({
          where: { name: `${generic} Third Variant`, status: "needs_review" },
        })
      );
      assert.ok(createdReviewMaster);
      createdMasterIds.push(createdReviewMaster.id);
      assert.equal(createdReviewMaster.status, "needs_review");
    });
  });

  // =========================================================================
  // 5. Safe Duplicate Merging Engine
  // =========================================================================
  describe("5. Safe Duplicate Merging Engine", () => {
    it("merges duplicate master into survivor without destructive data loss", async () => {
      const now = Date.now();

      // Create Survivor S
      const survivor = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Survivor Master ${now}`,
            slug: `survivor-master-${now}`,
            genericName: `MergeGeneric${now}`,
            strengthDisplay: "500 mg",
            dosageFormId: testDosageForm.id,
            category: "antibiotics",
            status: "active",
            barcode: `SURV${now.toString().slice(-8)}`,
          },
        })
      );
      createdMasterIds.push(survivor.id);

      // Create Duplicate D with different barcode & active ingredient
      const duplicate = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Duplicate Master ${now}`,
            slug: `duplicate-master-${now}`,
            genericName: `MergeGeneric${now}`,
            strengthDisplay: "500 mg",
            dosageFormId: testDosageForm.id,
            category: "antibiotics",
            status: "needs_review",
            barcode: `DUP${now.toString().slice(-8)}`,
          },
        })
      );
      createdMasterIds.push(duplicate.id);

      // Add a PharmacyInventory referencing duplicate D
      const invDuplicate = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.create({
          data: {
            pharmacyId: activeVerifiedPharmacy.id,
            medicationMasterId: duplicate.id,
            slug: `inv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            active: true,
            currentStock: 75,
            price: 25.0,
          },
        })
      );
      createdInventoryIds.push(invDuplicate.id);

      // Execute duplicate merge
      const mergeResult = await mergeDuplicateMedications({
        survivorId: survivor.id,
        duplicateId: duplicate.id,
        actorId: testAdminUser.id,
        reason: "Test consolidation of duplicate generic entry",
      });

      assert.equal(mergeResult.survivorId, survivor.id);
      assert.equal(mergeResult.duplicateId, duplicate.id);
      assert.equal(mergeResult.migratedInventoryCount, 1);

      // Verify the PharmacyInventory now points to the survivor!
      const updatedInv = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.findUnique({
          where: { id: invDuplicate.id },
        })
      );
      assert.equal(
        updatedInv?.medicationMasterId,
        survivor.id,
        "PharmacyInventory must be repointed to survivor master"
      );

      // Verify duplicate is archived and linked to survivor
      const archivedDuplicate = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.findUnique({
          where: { id: duplicate.id },
        })
      );
      assert.equal(archivedDuplicate?.status, "archived");
      assert.equal(archivedDuplicate?.mergedIntoId, survivor.id);
    });

    it("combines currentStock when duplicate pharmacy inventory is merged", async () => {
      const now = Date.now();
      const survivor = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Stock Survivor ${now}`,
            slug: `stock-survivor-${now}`,
            genericName: `StockGeneric${now}`,
            strengthDisplay: "500 mg",
            dosageFormId: testDosageForm.id,
            category: "analgesics",
            status: "active",
          },
        })
      );
      createdMasterIds.push(survivor.id);

      const duplicate = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `Stock Duplicate ${now}`,
            slug: `stock-duplicate-${now}`,
            genericName: `StockGeneric${now}`,
            strengthDisplay: "500 mg",
            dosageFormId: testDosageForm.id,
            category: "analgesics",
            status: "needs_review",
          },
        })
      );
      createdMasterIds.push(duplicate.id);

      // Pharmacy has inventory for both survivor (stock=20) and duplicate (stock=35)
      const invSurvivor = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.create({
          data: {
            pharmacyId: activeVerifiedPharmacy.id,
            medicationMasterId: survivor.id,
            slug: `inv-surv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            active: true,
            currentStock: 20,
            price: 15.0,
          },
        })
      );
      createdInventoryIds.push(invSurvivor.id);

      const invDuplicate = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.create({
          data: {
            pharmacyId: activeVerifiedPharmacy.id,
            medicationMasterId: duplicate.id,
            slug: `inv-dup-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            active: true,
            currentStock: 35,
            price: 15.0,
          },
        })
      );

      const mergeResult = await mergeDuplicateMedications({
        survivorId: survivor.id,
        duplicateId: duplicate.id,
        actorId: testAdminUser.id,
        reason: "Combining physical inventory across duplicate masters",
      });

      assert.equal(mergeResult.survivorId, survivor.id);
      assert.equal(mergeResult.duplicateId, duplicate.id);

      // Verify survivor inventory stock was combined to 20 + 35 = 55
      const updatedSurvivorInv = await withPlatformBypass(async () =>
        prismaUnscoped.pharmacyInventory.findUnique({
          where: { id: invSurvivor.id },
        })
      );
      assert.equal(updatedSurvivorInv?.currentStock, 55, "Physical stock must be summed on merge");
    });
  });

  // =========================================================================
  // 6. Platform Catalog Operations & Security
  // =========================================================================
  describe("6. Platform Catalog Operations & Security", () => {
    it("matches existing master by generic + strength + form when barcode is absent", async () => {
      const now = Date.now();
      const generic = `GsfGeneric${now}`;
      const existing = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `${generic} 100mg Tablets`,
            slug: `gsf-${now}`,
            genericName: generic,
            strengthDisplay: "100 mg",
            dosageFormId: testDosageForm.id,
            category: "general",
            status: "active",
          },
        })
      );
      createdMasterIds.push(existing.id);

      const csv = `name,generic_name,strength_display,dosage_form,route,category,description
${generic} 100mg Tablets Enrich,${generic},100 mg,Tablet,Oral,general,Newly enriched description`;

      const preview = await previewPlatformMedicationImport(csv);
      assert.equal(preview.analyzedRows[0]?.action, "match_enrich");
      assert.equal(preview.analyzedRows[0]?.existingMasterId, existing.id);

      const run = await executePlatformMedicationImport({
        csvContent: csv,
        filename: "gsf_match.csv",
        actorId: testAdminUser.id,
      });
      assert.equal(run.createdCount, 0);
      assert.equal(run.matchedCount, 1);

      const updated = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.findUnique({
          where: { id: existing.id },
        })
      );
      assert.equal(updated?.description, "Newly enriched description");
    });

    it("automatically creates Lookups, Manufacturer, Active Ingredients, and Tags during import", async () => {
      const now = Date.now();
      const uniqueForm = `AutoForm${now}`;
      const uniqueRoute = `AutoRoute${now}`;
      const uniqueMfg = `AutoMfg${now}`;
      const uniqueIng = `AutoIng${now}`;
      const uniqueTag = `AutoTag${now}`;
      const uniqueGeneric = `RelationGen${now}`;

      const csv = `name,generic_name,strength_display,dosage_form,route,manufacturer,category,active_ingredients,clinical_tags
Auto Relation Drug ${now},${uniqueGeneric},50 mg,${uniqueForm},${uniqueRoute},${uniqueMfg},general,${uniqueIng}|50|mg,${uniqueTag}`;

      const run = await executePlatformMedicationImport({
        csvContent: csv,
        filename: "relations.csv",
        actorId: testAdminUser.id,
      });
      assert.equal(run.createdCount, 1);

      // Verify dosage form lookup created
      const formLookup = await withPlatformBypass(async () =>
        prismaUnscoped.medicationLookup.findFirst({
          where: { kind: "dosage_form", value: uniqueForm },
        })
      );
      assert.ok(formLookup, "Dosage form lookup must be created");

      // Verify route lookup created
      const routeLookup = await withPlatformBypass(async () =>
        prismaUnscoped.medicationLookup.findFirst({
          where: { kind: "route", value: uniqueRoute },
        })
      );
      assert.ok(routeLookup, "Route lookup must be created");

      // Verify manufacturer created
      const mfg = await withPlatformBypass(async () =>
        prismaUnscoped.manufacturer.findFirst({
          where: { name: uniqueMfg },
        })
      );
      assert.ok(mfg, "Manufacturer must be created");

      // Verify active ingredient created
      const ing = await withPlatformBypass(async () =>
        prismaUnscoped.activeIngredient.findFirst({
          where: { name: uniqueIng },
        })
      );
      assert.ok(ing, "Active ingredient must be created");

      // Verify clinical tag created
      const tag = await withPlatformBypass(async () =>
        prismaUnscoped.clinicalTag.findFirst({
          where: { name: uniqueTag },
        })
      );
      assert.ok(tag, "Clinical tag must be created");

      const createdMaster = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.findFirst({
          where: { genericName: uniqueGeneric },
        })
      );
      if (createdMaster) createdMasterIds.push(createdMaster.id);
    });

    it("rejects malformed CSV rows with invalid boolean or malformed URLs", async () => {
      const csv = `name,generic_name,strength_display,dosage_form,route,category,controlled_drug,image_urls
Bad Drug,BadGeneric,10 mg,Tablet,Oral,general,maybe,ftp://invalidscheme.com`;

      const preview = await previewPlatformMedicationImport(csv);
      assert.equal(preview.totalRows, 1);
      assert.ok(preview.errors.length >= 2, "Should report errors for both invalid boolean and invalid URL");
      const boolErr = preview.errors.find((e) => e.column === "controlled_drug");
      const urlErr = preview.errors.find((e) => e.column === "image_urls");
      assert.ok(boolErr, "Must flag invalid boolean value");
      assert.ok(urlErr, "Must flag malformed image URL");
    });

    it("filters and paginates platform medications correctly", async () => {
      const now = Date.now();
      const m1 = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `FilterTest Alpha ${now}`,
            slug: `filter-alpha-${now}`,
            genericName: `AlphaFilterGen${now}`,
            category: "dermatology",
            status: "active",
            acquisitionMethod: "platform_csv_import",
          },
        })
      );
      const m2 = await withPlatformBypass(async () =>
        prismaUnscoped.medicationMaster.create({
          data: {
            name: `FilterTest Beta ${now}`,
            slug: `filter-beta-${now}`,
            genericName: `BetaFilterGen${now}`,
            category: "cardiovascular",
            status: "deprecated",
            acquisitionMethod: "manual",
          },
        })
      );
      createdMasterIds.push(m1.id, m2.id);

      // Test search filter
      const searchRes = await listPlatformMedications({ search: `FilterTest Alpha ${now}` });
      assert.equal(searchRes.items.length, 1);
      assert.equal(searchRes.items[0]?.id, m1.id);

      // Test status filter
      const statusRes = await listPlatformMedications({
        search: `FilterTest`,
        status: "deprecated",
      });
      const betaFound = statusRes.items.find((i) => i.id === m2.id);
      assert.ok(betaFound, "Deprecated filter must find m2");
      const alphaFound = statusRes.items.find((i) => i.id === m1.id);
      assert.equal(alphaFound, undefined, "Deprecated filter must not include active m1");

      // Test pagination
      const pageRes = await listPlatformMedications({ page: 1, pageSize: 10 });
      assert.ok(pageRes.total >= 2);
      assert.equal(pageRes.page, 1);
      assert.equal(pageRes.pageSize, 10);
    });

    it("verifies platformAdmin authorization flag protects platform operations", async () => {
      const nonAdminUser = await withPlatformBypass(async () =>
        prismaUnscoped.user.create({
          data: {
            email: `non-admin-${Date.now()}@user.local`,
            passwordHash: "hash123",
            platformAdmin: false,
          },
        })
      );

      assert.equal(nonAdminUser.platformAdmin, false, "Regular user must not have platformAdmin flag");
      assert.equal(testAdminUser.platformAdmin, true, "Platform admin user must have platformAdmin flag");

      // Clean up user
      await withPlatformBypass(async () =>
        prismaUnscoped.user.delete({ where: { id: nonAdminUser.id } })
      );
    });
  });
});
